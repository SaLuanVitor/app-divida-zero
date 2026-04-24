module Api
  module V1
    class FinancialRecordsController < ApplicationController
      before_action :authenticate_access_token!
      STATUS_TRANSITIONS = {
        "income" => {
          "pending" => "received",
          "received" => "pending"
        },
        "expense" => {
          "pending" => "paid",
          "paid" => "pending"
        }
      }.freeze

      def index
        records = @current_user.financial_records.order(:due_date)

        if params[:year].present? && params[:month].present?
          year = params[:year].to_i
          month = params[:month].to_i
          records = records.from_month(year, month)
        end

        render json: {
          records: records.limit(300).map { |record| serialize_record(record) }
        }, status: :ok
      end

      def create
        payload = create_params
        generated = generate_records(payload)
        xp_feedback = GamificationService.award!(
          user: @current_user,
          event_type: "record_created",
          points: generated.size * 50,
          source: generated.first,
          metadata: {
            created_count: generated.size,
            mode: payload[:mode].presence || "launch",
            record_title: generated.first.title,
            category: generated.first.category
          }
        )
        FinancialGoalsProgressService.recalculate_for_user!(@current_user)
        GamificationService.sync_record_achievements!(@current_user, source: generated.first)
        DailyAchievementsService.sync_for_user!(@current_user)
        xp_feedback = refresh_feedback_summary(xp_feedback)

        render json: {
          message: "Registro criado com sucesso.",
          created_count: generated.size,
          records: generated.map { |record| serialize_record(record) },
          xp_feedback: xp_feedback
        }, status: :created
      rescue ArgumentError => error
        render json: { error: error.message }, status: :unprocessable_entity
      end

      def pay
        record = @current_user.financial_records.find(params[:id])
        if record.status != "pending"
          return render json: {
            message: "Este registro já estava concluído.",
            record: serialize_record(record),
            xp_feedback: nil
          }, status: :ok
        end

        result = apply_record_status_transition(record: record, next_status: transition_target_for(record, "pending"))
        render json: result, status: :ok
      end

      def update_status
        record = @current_user.financial_records.find(params[:id])
        next_status = params[:status].to_s
        allowed = STATUS_TRANSITIONS.fetch(record.flow_type, {})

        unless allowed[record.status] == next_status
          return render json: {
            error: "Transição de status inválida para este registro."
          }, status: :unprocessable_entity
        end

        result = apply_record_status_transition(record: record, next_status: next_status)
        render json: result, status: :ok
      end

      def destroy
        record = @current_user.financial_records.find(params[:id])
        scope = params[:scope].to_s
        if scope == "group" && record.group_code.present?
          records_to_delete = @current_user.financial_records.where(group_code: record.group_code).to_a
          deleted_count = records_to_delete.size
          settled_count = records_to_delete.count { |item| item.status != "pending" }
          contribution_ids = records_to_delete.map(&:financial_goal_contribution_id).compact.uniq
          ActiveRecord::Base.transaction do
            @current_user.financial_records.where(group_code: record.group_code).delete_all
            remove_linked_goal_contributions!(contribution_ids)
          end

          xp_feedback = revert_xp_for_deletion!(deleted_count: deleted_count, settled_count: settled_count, source: record)
          FinancialGoalsProgressService.recalculate_for_user!(@current_user)
          DailyAchievementsService.sync_for_user!(@current_user)
          xp_feedback = refresh_feedback_summary(xp_feedback)
          return render json: {
            message: "Registros do grupo excluídos com sucesso.",
            deleted_count: deleted_count,
            xp_feedback: xp_feedback
          }, status: :ok
        end

        settled_count = record.status == "pending" ? 0 : 1
        contribution_ids = [record.financial_goal_contribution_id].compact
        ActiveRecord::Base.transaction do
          record.destroy!
          remove_linked_goal_contributions!(contribution_ids)
        end
        xp_feedback = revert_xp_for_deletion!(deleted_count: 1, settled_count: settled_count, source: record)
        FinancialGoalsProgressService.recalculate_for_user!(@current_user)
        DailyAchievementsService.sync_for_user!(@current_user)
        xp_feedback = refresh_feedback_summary(xp_feedback)

        render json: {
          message: "Registro excluído com sucesso.",
          deleted_count: 1,
          xp_feedback: xp_feedback
        }, status: :ok
      end

      private

      def create_params
        params.fetch(:financial_record, params).permit(
          :mode,
          :title,
          :description,
          :amount,
          :start_date,
          :flow_type,
          :category,
          :priority,
          :notes,
          :recurring,
          :recurrence_type,
          :recurrence_count,
          :installments_total,
          :day_of_month
        )
      end

      def generate_records(payload)
        mode = payload[:mode].presence || "launch"
        title = payload[:title].presence || default_title(mode, payload[:flow_type])
        amount = parse_decimal(payload[:amount])
        start_date = parse_date(payload[:start_date])
        category = payload[:category].presence
        priority = payload[:priority].presence || "normal"
        recurring = cast_boolean(payload[:recurring])
        recurrence_type = normalize_recurrence_type(payload[:recurrence_type])
        recurrence_count = normalize_recurrence_count(payload[:recurrence_count], recurrence_type)

        if mode == "debt"
          if recurring
            return generate_debt_recurring_records(
              title: title,
              amount: amount,
              start_date: start_date,
              recurrence_type: recurrence_type,
              recurrence_count: recurrence_count,
              category: category,
              priority: priority,
              notes: payload[:notes],
              description: payload[:description]
            )
          end

          return generate_debt_installments(
            title: title,
            amount: amount,
            start_date: start_date,
            installments_total: [payload[:installments_total].to_i, 1].max,
            day_of_month: payload[:day_of_month].to_i,
            category: category,
            priority: priority,
            notes: payload[:notes],
            description: payload[:description]
          )
        end

        generate_launch_records(
          title: title,
          amount: amount,
          start_date: start_date,
          flow_type: payload[:flow_type].presence || "expense",
          recurring: recurring,
          recurrence_type: recurrence_type,
          recurrence_count: recurrence_count,
          category: category,
          priority: priority,
          notes: payload[:notes],
          description: payload[:description]
        )
      end

      def generate_debt_installments(title:, amount:, start_date:, installments_total:, day_of_month:, category:, priority:, notes:, description:)
        group_code = SecureRandom.uuid
        first_due_date = first_due_date_for_installments(start_date, day_of_month)

        ActiveRecord::Base.transaction do
          Array.new(installments_total) do |index|
            due_date = first_due_date.advance(months: index)

            @current_user.financial_records.create!(
              title: title,
              description: description,
              record_type: "debt",
              flow_type: "expense",
              amount: amount,
              status: "pending",
              due_date: due_date,
              recurring: false,
              recurrence_type: "none",
              recurrence_count: 1,
              installments_total: installments_total,
              installment_number: index + 1,
              group_code: group_code,
              category: category,
              priority: priority,
              notes: notes
            )
          end
        end
      end

      def generate_debt_recurring_records(title:, amount:, start_date:, recurrence_type:, recurrence_count:, category:, priority:, notes:, description:)
        group_code = SecureRandom.uuid

        ActiveRecord::Base.transaction do
          Array.new(recurrence_count) do |index|
            due_date = recurrence_date(start_date, recurrence_type, index)

            @current_user.financial_records.create!(
              title: title,
              description: description,
              record_type: "debt",
              flow_type: "expense",
              amount: amount,
              status: "pending",
              due_date: due_date,
              recurring: true,
              recurrence_type: recurrence_type,
              recurrence_count: recurrence_count,
              installments_total: 1,
              installment_number: 1,
              group_code: group_code,
              category: category,
              priority: priority,
              notes: notes
            )
          end
        end
      end

      def generate_launch_records(title:, amount:, start_date:, flow_type:, recurring:, recurrence_type:, recurrence_count:, category:, priority:, notes:, description:)
        count = recurring ? recurrence_count : 1
        group_code = recurring ? SecureRandom.uuid : nil

        ActiveRecord::Base.transaction do
          Array.new(count) do |index|
            due_date = recurring ? recurrence_date(start_date, recurrence_type, index) : start_date

            @current_user.financial_records.create!(
              title: title,
              description: description,
              record_type: "launch",
              flow_type: flow_type,
              amount: amount,
              status: "pending",
              due_date: due_date,
              recurring: recurring,
              recurrence_type: recurring ? recurrence_type : "none",
              recurrence_count: count,
              installments_total: 1,
              installment_number: 1,
              group_code: group_code,
              category: category,
              priority: priority,
              notes: notes
            )
          end
        end
      end

      def first_due_date_for_installments(start_date, day_of_month)
        return start_date if day_of_month <= 0

        day = [[day_of_month, 1].max, 28].min
        due = Date.new(start_date.year, start_date.month, day)
        due < start_date ? due.next_month : due
      end

      def recurrence_date(start_date, recurrence_type, index)
        case recurrence_type
        when "daily"
          start_date + index.days
        when "weekly"
          start_date + index.weeks
        when "yearly"
          start_date.advance(years: index)
        else
          start_date.advance(months: index)
        end
      end

      def normalize_recurrence_type(raw)
        recurrence_type = raw.to_s.presence || "monthly"
        return "monthly" if recurrence_type == "none"

        recurrence_type
      end

      def normalize_recurrence_count(raw, recurrence_type)
        requested = [raw.to_i, 1].max
        max = recurrence_type == "daily" ? 365 : 36
        [requested, max].min
      end

      def parse_decimal(value)
        cleaned = value.to_s.tr(",", ".")
        decimal = BigDecimal(cleaned)
        raise ArgumentError, "Informe um valor maior que zero." if decimal <= 0

        decimal
      rescue StandardError
        raise ArgumentError, "Valor inválido."
      end

      def parse_date(value)
        Date.parse(value.to_s)
      rescue StandardError
        raise ArgumentError, "Data inicial inválida. Use o formato AAAA-MM-DD."
      end

      def cast_boolean(value)
        value == true || value.to_s.downcase == "true" || value.to_s == "1"
      end

      def default_title(mode, flow_type)
        return "Nova dívida" if mode == "debt"

        flow_type == "income" ? "Novo ganho" : "Novo lançamento"
      end

      def transition_target_for(record, from_status)
        STATUS_TRANSITIONS.fetch(record.flow_type, {}).fetch(from_status)
      end

      def apply_record_status_transition(record:, next_status:)
        previous_status = record.status
        message = transition_message(record: record, next_status: next_status)
        record.update!(
          status: next_status,
          paid_at: next_status == "pending" ? nil : Time.current
        )

        xp_feedback = award_status_transition_xp(record: record, previous_status: previous_status, next_status: next_status)
        FinancialGoalsProgressService.recalculate_for_user!(@current_user)
        GamificationService.sync_record_achievements!(@current_user, source: record)
        DailyAchievementsService.sync_for_user!(@current_user)
        xp_feedback = refresh_feedback_summary(xp_feedback)

        {
          message: message,
          record: serialize_record(record),
          xp_feedback: xp_feedback
        }
      end

      def award_status_transition_xp(record:, previous_status:, next_status:)
        metadata = {
          flow_type: record.flow_type,
          record_type: record.record_type,
          record_title: record.title,
          category: record.category
        }

        if previous_status == "pending" && next_status != "pending"
          event_type = record.flow_type == "income" ? "income_received" : "expense_paid"
          return GamificationService.award!(
            user: @current_user,
            event_type: event_type,
            points: 20,
            source: record,
            metadata: metadata
          )
        end

        if previous_status != "pending" && next_status == "pending"
          return GamificationService.award!(
            user: @current_user,
            event_type: "record_reopened",
            points: -20,
            source: record,
            metadata: metadata
          )
        end

        nil
      end

      def transition_message(record:, next_status:)
        return record.flow_type == "income" ? "Registro marcado como recebido." : "Registro marcado como pago." if next_status != "pending"

        "Registro voltou para pendente."
      end

      def serialize_record(record)
        {
          id: record.id,
          title: record.title,
          description: record.description,
          record_type: record.record_type,
          flow_type: record.flow_type,
          amount: record.amount.to_s,
          status: record.status,
          due_date: record.due_date,
          recurring: record.recurring,
          recurrence_type: record.recurrence_type,
          recurrence_count: record.recurrence_count,
          installments_total: record.installments_total,
          installment_number: record.installment_number,
          category: record.category,
          priority: record.priority,
          notes: record.notes,
          group_code: record.group_code,
          financial_goal_id: record.financial_goal_id,
          financial_goal_contribution_id: record.financial_goal_contribution_id
        }
      end

      def revert_xp_for_deletion!(deleted_count:, settled_count:, source:)
        points_to_revert = (deleted_count * 50) + (settled_count * 20)
        return nil if points_to_revert <= 0

        GamificationService.award!(
          user: @current_user,
          event_type: "record_deleted",
          points: -points_to_revert,
          source: source,
          metadata: {
            deleted_count: deleted_count,
            settled_count: settled_count,
            record_title: source.title,
            category: source.category
          }
        )
      end

      def remove_linked_goal_contributions!(contribution_ids)
        return if contribution_ids.empty?

        @current_user.financial_goal_contributions.where(id: contribution_ids).delete_all
      end

      def authenticate_access_token!
        token = request.headers["Authorization"].to_s.split(" ").last
        payload = JsonWebToken.decode(token, expected_type: "access")
        @current_user = User.find(payload["sub"])
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Não autorizado." }, status: :unauthorized
      end

      def refresh_feedback_summary(xp_feedback)
        return xp_feedback if xp_feedback.nil?

        original_level = xp_feedback.dig(:summary, :level).to_i
        current_summary = GamificationService.summary_for(@current_user)
        xp_feedback[:summary] = current_summary
        xp_feedback[:leveled_up] = true if current_summary[:level].to_i > original_level
        xp_feedback
      end
    end
  end
end


