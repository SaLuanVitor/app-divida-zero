module Api
  module V1
    module Financial
      class ConnectionsController < ApplicationController
        before_action :authenticate_access_token!

        def create
          return render json: { error: 'Open Finance desabilitado' }, status: :forbidden \
            unless FeatureFlags.enabled?(:open_finance)

          connection = current_user.financial_connections.build(
            provider: Setting.open_finance_provider,
            provider_institution_id: params[:institution_id],
            status: :pending
          )

          adapter = FinancialProviders::Factory.build(connection.provider)
          result = adapter.create_connection(current_user)

          connection.provider_item_id = result[:item_id] || "pending_#{SecureRandom.hex(8)}"
          connection.save!

          render json: {
            connection: connection.as_json(only: %i[id provider provider_item_id provider_institution_id status]),
            connect_token: result[:connect_token],
            connect_url: result[:connect_url]
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
            last_sync: last_sync&.as_json(only: %i[id sync_type status started_at finished_at records_created records_updated records_deleted])
          }, status: :ok
        end

        def destroy
          connection = current_user.financial_connections.find(params[:id])

          adapter = FinancialProviders::Factory.build(connection.provider)
          adapter.disconnect_connection(connection) if connection.pluggy?

          connection.destroy!

          head :no_content
        rescue FinancialProviders::Pluggy::PluggyApiError => e
          Rails.logger.error("Pluggy disconnect failed: #{e.message}")
          # Mesmo com erro no provider, removemos localmente
          connection.destroy!
          head :no_content
        end

        def sync
          connection = current_user.financial_connections.find(params[:id])
          FinancialSyncJob.perform_later(financial_connection_id: connection.id, sync_type: :full)

          render json: { message: 'Sincronização iniciada', connection_id: connection.id }, status: :accepted
        end

        private

        def authenticate_access_token!
          super
        end
      end
    end
  end
end