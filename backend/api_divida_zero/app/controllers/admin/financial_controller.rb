module Admin
  class FinancialController < ApplicationController
    before_action :authenticate_admin!

    def index
      @provider_status = provider_health
      @connections_stats = connections_stats
      @users_stats = users_stats
      @last_sync = last_successful_sync
      @errors_24h = errors_last_24h
      @queue_depth = queue_depth
      @recent_syncs = recent_syncs
    end

    def provider_health
      @provider_status ||= begin
        adapter = FinancialProviders::Factory.build
        online = adapter.ping
        {
          name: Setting.open_finance_provider&.humanize || 'Pluggy',
          online: online,
          last_check: Time.current
        }
      end
    end

    def connections_stats
      total_connections = FinancialConnection.active.count
      max_total = PlanLimit.connections_max_total
      percentage = max_total > 0 ? ((total_connections.to_f / max_total) * 100).round : 0

      {
        total: total_connections,
        max_total: max_total,
        percentage: percentage,
        by_provider: FinancialConnection.active.group(:provider).count,
        by_status: FinancialConnection.group(:status).count
      }
    end

    def users_stats
      total_users = User.active.count
      max_users = PlanLimit.users_max
      percentage = max_users > 0 ? ((total_users.to_f / max_users) * 100).round : 0

      {
        total: total_users,
        max_users: max_users,
        percentage: percentage,
        with_connections: User.joins(:financial_connections).where(financial_connections: { status: :active }).distinct.count
      }
    end

    def last_successful_sync
      FinancialSync.completed.recent.first&.finished_at
    end

    def errors_last_24h
      FinancialSync.failed.where('started_at >= ?', 24.hours.ago).count
    end

    def queue_depth
      SolidQueue::Job.where(class_name: 'FinancialSyncJob').where(finished_at: nil).count
    end

    def recent_syncs
      FinancialSync.recent.limit(50).includes(:financial_connection => :user)
    end

    def connections
      @connections = FinancialConnection.includes(:user, :financial_accounts, :financial_syncs)
                                       .order(created_at: :desc)
                                       .page(params[:page])
                                       .per(20)

      if params[:status].present?
        @connections = @connections.where(status: params[:status])
      end

      if params[:provider].present?
        @connections = @connections.where(provider: params[:provider])
      end

      if params[:institution_id].present?
        @connections = @connections.where(provider_institution_id: params[:institution_id])
      end

      if params[:user_id].present?
        @connections = @connections.where(user_id: params[:user_id])
      end

      render layout: 'admin'
    end

    def sync_logs
      @syncs = FinancialSync.includes(:financial_connection => :user)
                            .order(started_at: :desc)
                            .page(params[:page])
                            .per(25)
      render layout: 'admin'
    end

    private

    def authenticate_admin!
      authenticate_access_token!
      unless current_user&.admin?
        render json: { error: 'Acesso negado. Apenas administradores.' }, status: :forbidden
      end
    end
  end
end