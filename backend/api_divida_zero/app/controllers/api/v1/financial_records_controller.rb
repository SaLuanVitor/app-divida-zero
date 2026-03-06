module Api
  module V1
    class FinancialRecordsController < ApplicationController
      before_action :authenticate_access_token!

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

        render json: {
          message: "Registro criado com sucesso.",
          created_count: generated.size,
          records: generated.map { |record| serialize_record(record) }
        }, status: :created
      rescue ArgumentError => error
        render json: { error: error.message }, status: :unprocessable_entity
      end

      def pay
        record = @current_user.financial_records.find(params[:id])
        new_status = record.flow_type == "income" ? "received" : "paid"
        message = record.flow_type == "income" ? "Registro marcado como recebido." : "Registro marcado como pago."
        record.update!(status: new_status, paid_at: Time.current)

        render json: {
          message: message,
          record: serialize_record(record)
        }, status: :ok
      end

      def destroy
        record = @current_user.financial_records.find(params[:id])
        scope = params[:scope].to_s
        if scope == "group" && record.group_code.present?
          deleted_count = @current_user.financial_records.where(group_code: record.group_code).delete_all
          return render json: { message: "Registros do grupo excluídos com sucesso.", deleted_count: deleted_count }, status: :ok
        end

        record.destroy!

        render json: { message: "Registro excluído com sucesso.", deleted_count: 1 }, status: :ok
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
          group_code: record.group_code
        }
      end

      def authenticate_access_token!
        token = request.headers["Authorization"].to_s.split(" ").last
        payload = JsonWebToken.decode(token, expected_type: "access")
        @current_user = User.find(payload["sub"])
      rescue JWT::DecodeError, ActiveRecord::RecordNotFound
        render json: { error: "Não autorizado." }, status: :unauthorized
      end
    end
  end
end
