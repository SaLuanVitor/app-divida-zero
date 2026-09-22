module Api
  module V1
    module Financial
      class ConnectionsController < ApplicationController
        before_action :authenticate_access_token!
        before_action :check_open_finance_enabled, only: %i[create show destroy sync transactions]

        def create
          # Validar limites antes de criar conexão
          unless LimitsService.allowed?(current_user, :connections, :create)
            plan_name = current_user.plan&.name&.humanize || 'Free'

            return render json: {
              error: 'Limite de conexões atingido',
              message: "Limite de #{LimitsService.usage(current_user)[:connections] + 1} conexões por usuário atingido. Plano: #{plan_name}.",
              limit_exceeded: true,
              resource: 'connections',
              limit: LimitsService.usage(current_user)[:connections] + 1,
              used: LimitsService.usage(current_user)[:connections]
            }, status: :forbidden
          end

          connection = current_user.financial_connections.build(
            provider: Setting.open_finance_provider,
            provider_institution_id: params[:institution_id],
            status: :pending
          )

          adapter = FinancialProviders::Factory.build(connection.provider)
          result = adapter.create_connection(current_user)

          connection.provider_item_id = result[:item_id] || "pending_#{SecureRandom.hex(8)}"
          connection.save!

          LimitsService.clear_cache(current_user)

          render json: {
            connection: connection.as_json(only: %i[id provider provider_item_id provider_institution_id status]),
            connect_token: result[:connect_token],
            connect_url: result[:connect_url],
            limits: limits_info(current_user)
          }, status: :created
        rescue FinancialProviders::Pluggy::PluggyApiError => e
          Rails.logger.error("Pluggy create_connection failed: #{e.message}")
          render json: { error: 'Erro ao conectar com o banco', details: e.message }, status: :bad_gateway
        rescue StandardError => e
          Rails.logger.error("Create connection failed: #{e.message}")
          render json: { error: 'Erro interno' }, status: :internal_server_error
        end

        def show
          connection = current_user.financial_connections.find(params[:id])
          last_sync = connection.financial_syncs.recent.first

          render json: {
            connection: connection.as_json(
              only: %i[id provider provider_item_id provider_institution_id status last_synced_at last_sync_error metadata],
              include: {
                financial_accounts: { only: %i[id provider_account_id name account_type balance currency] }
              }
            ),
            last_sync: last_sync&.as_json(only: %i[id sync_type status started_at finished_at records_created records_updated records_deleted]),
            limits: limits_info(current_user)
          }, status: :ok
        end

        def destroy
          connection = current_user.financial_connections.find(params[:id])

          adapter = FinancialProviders::Factory.build(connection.provider)
          adapter.disconnect_connection(connection) if connection.pluggy?

          connection.destroy!

          LimitsService.clear_cache(current_user)

          head :no_content
        rescue FinancialProviders::Pluggy::PluggyApiError => e
          Rails.logger.error("Pluggy disconnect failed: #{e.message}")
          connection.destroy!
          LimitsService.clear_cache(current_user)
          head :no_content
        end

        def sync
          connection = current_user.financial_connections.find(params[:id])

          unless LimitsService.allowed?(current_user, :syncs, :create)
            return render json: {
              error: 'Limite de sincronizações diárias atingido',
              message: 'Você atingiu o limite de sincronizações manuais por dia.',
              limit_exceeded: true,
              resource: 'syncs'
            }, status: :forbidden
          end

          FinancialSyncJob.perform_later(financial_connection_id: connection.id, sync_type: :full)

          render json: { message: 'Sincronização iniciada', connection_id: connection.id }, status: :accepted
        end

        def transactions
          connection = current_user.financial_connections.find(params[:id])

          transactions = connection.imported_transactions
                                   .pending_or_duplicate
                                   .order(date: :desc)
                                   .limit(200)

          grouped = transactions.group_by(&:date).map do |date, items|
            { date: date, transactions: items.map { |t| serialize_transaction(t) } }
          end

          render json: {
            groups: grouped,
            total: transactions.size
          }, status: :ok
        end

        private

        def check_open_finance_enabled
          unless FeatureFlags.enabled?(:open_finance)
            render json: { error: 'Open Finance desabilitado' }, status: :forbidden
          end
        end

        def serialize_transaction(txn)
          {
            id: txn.id,
            description: txn.description,
            amount: txn.amount.to_s,
            date: txn.date,
            flow_type: txn.flow_type,
            suggested_category: txn.suggested_category,
            ai_confidence: txn.ai_confidence,
            original_category: txn.original_category,
            status: txn.status,
            duplicate_reason: txn.duplicate_reason,
            duplicate_of_id: txn.duplicate_of_id
          }
        end

        def limits_info(user)
          {
            connections: {
              used: LimitsService.usage(user)[:connections],
              limit: user.plan&.limits&.find_by(key: 'connections.max_per_user')&.value || PlanLimit.connections_max_per_user,
              remaining: LimitsService.remaining(user, :connections),
              percentage: LimitsService.percentage_used(user, :connections),
              status: LimitsService.status(user, :connections)
            },
            accounts: {
              used: LimitsService.usage(user)[:accounts],
              limit: user.plan&.limits&.find_by(key: 'accounts.max_per_user')&.value || PlanLimit.accounts_max_per_user,
              remaining: LimitsService.remaining(user, :accounts),
              percentage: LimitsService.percentage_used(user, :accounts),
              status: LimitsService.status(user, :accounts)
            },
            syncs: {
              used: LimitsService.usage(user)[:syncs_today],
              limit: user.plan&.limits&.find_by(key: 'sync.manual_per_day')&.value || PlanLimit.sync_manual_per_day,
              remaining: LimitsService.remaining(user, :syncs),
              percentage: LimitsService.percentage_used(user, :syncs),
              status: LimitsService.status(user, :syncs)
            }
          }
        end

        def authenticate_access_token!
          super
        end
      end
    end
  end
end