module Api
  module V1
    module Admin
      class UsersController < BaseController
        DEFAULT_PER_PAGE = 20
        MAX_PER_PAGE = 100

        def index
          scoped = User.order(created_at: :desc)
          scoped = scoped.where("name ILIKE :q OR email ILIKE :q", q: "%#{query}%") if query.present?
          scoped = scoped.where(role: params[:role]) if valid_role_filter?
          scoped = scoped.where(active: active_filter) unless active_filter.nil?

          total = scoped.count
          page = normalized_page
          per_page = normalized_per_page
          users = scoped.offset((page - 1) * per_page).limit(per_page)

          render json: {
            users: users.map { |user| serialize_user(user) },
            pagination: {
              page: page,
              per_page: per_page,
              total: total,
              total_pages: (total.to_f / per_page).ceil
            }
          }, status: :ok
        end

        def update_status
          user = User.find(params[:id])
          next_active = ActiveModel::Type::Boolean.new.cast(params.require(:active))

          if user.id == @current_user.id && !next_active
            return render json: { error: "Não é possível inativar a própria conta admin." }, status: :unprocessable_entity
          end

          if user.role == "admin" && !next_active && user.active? && User.admins.active_users.where.not(id: user.id).none?
            return render json: { error: "Não é possível inativar o último admin ativo." }, status: :unprocessable_entity
          end

          user.update!(active: next_active)

          render json: {
            message: next_active ? "Conta ativada com sucesso." : "Conta inativada com sucesso.",
            user: serialize_user(user)
          }, status: :ok
        end

        def reset_password
          user = User.find(params[:id])
          temporary_password = params.require(:temporary_password).to_s

          if temporary_password.length < 8
            return render json: { error: "A senha temporária deve ter no mínimo 8 caracteres." }, status: :unprocessable_entity
          end

          user.password = temporary_password
          user.password_confirmation = temporary_password
          user.force_password_change = true
          user.active = true
          user.save!

          render json: {
            message: "Senha temporária definida. O usuário deverá trocá-la no próximo acesso.",
            user: serialize_user(user)
          }, status: :ok
        end

        private

        def serialize_user(user)
          {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.active,
            force_password_change: user.force_password_change,
            created_at: user.created_at,
            last_login_at: user.last_login_at,
            has_rating: user.app_ratings.exists?
          }
        end

        def normalized_page
          value = params[:page].to_i
          value > 0 ? value : 1
        end

        def normalized_per_page
          value = params[:per_page].to_i
          return DEFAULT_PER_PAGE if value <= 0

          [value, MAX_PER_PAGE].min
        end

        def query
          params[:q].to_s.strip
        end

        def valid_role_filter?
          User::ROLES.include?(params[:role].to_s)
        end

        def active_filter
          return nil unless params.key?(:active)

          ActiveModel::Type::Boolean.new.cast(params[:active])
        end
      end
    end
  end
end
