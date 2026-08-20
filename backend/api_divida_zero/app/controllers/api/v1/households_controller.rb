module Api
  module V1
    class HouseholdsController < ApplicationController
      before_action :authenticate_access_token!
      before_action :set_household, only: %i[show update destroy]

      def show
        if @household
          render json: serialize_household(@household)
        else
          render json: { household: nil, message: "Você não pertence a nenhuma família." }
        end
      end

      def create
        if current_household
          return render json: { error: "Você já pertence a uma família." }, status: :conflict
        end

        household = nil

        ActiveRecord::Base.transaction do
          household = Household.create!(household_params)
          household.household_memberships.create!(user: @current_user, role: "owner", joined_at: Time.current)
        end

        render json: serialize_household(household), status: :created
      end

      def update
        unless @household.owner?(@current_user)
          return render json: { error: "Apenas o proprietário pode editar a família." }, status: :forbidden
        end

        @household.update!(household_params)
        render json: serialize_household(@household)
      end

      def destroy
        membership = @household.household_memberships.find_by(user: @current_user)

        if @household.owner?(@current_user)
          other_members = @household.household_memberships.where.not(role: "owner")
          if other_members.any?
            return render json: { error: "Transfira a propriedade ou remova os membros antes de sair." }, status: :conflict
          end

          @household.destroy!
          render json: { message: "Família excluída." }
        else
          membership&.destroy!
          render json: { message: "Você saiu da família." }
        end
      end

      private

      def set_household
        @household = current_household
      end

      def current_household
        @current_user.households.first
      end

      def household_params
        params.require(:household).permit(:name)
      end

      def serialize_household(household)
        members = household.household_memberships.includes(:user).order(created_at: :asc).map do |m|
          {
            id: m.id,
            user_id: m.user_id,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            joined_at: m.joined_at
          }
        end

        {
          id: household.id,
          name: household.name,
          invite_code: household.invite_code,
          members: members,
          owner_id: household.owner&.id
        }
      end
    end
  end
end
