module Api
  module V1
    class HouseholdInvitationsController < ApplicationController
      before_action :authenticate_access_token!
      before_action :set_household

      def index
        invitations = @household.household_invitations.pending.order(created_at: :desc)
        render json: { invitations: invitations.map { |i| serialize_invitation(i) } }
      end

      def create
        unless @household.owner?(@current_user)
          return render json: { error: "Apenas o proprietário pode convidar." }, status: :forbidden
        end

        email = params.require(:email).to_s.strip.downcase
        return render json: { error: "Email inválido." }, status: :unprocessable_entity unless email.match?(URI::MailTo::EMAIL_REGEXP)

        if @household.users.joins(:household_memberships).where(users: { email: email }).exists?
          return render json: { error: "Este email já é membro da família." }, status: :conflict
        end

        invitation = @household.household_invitations.create!(
          email: email,
          invited_by: @current_user
        )

        render json: { invitation: serialize_invitation(invitation) }, status: :created
      end

      def destroy
        invitation = @household.household_invitations.pending.find(params[:id])

        unless @household.owner?(@current_user)
          return render json: { error: "Apenas o proprietário pode cancelar convites." }, status: :forbidden
        end

        invitation.update!(status: "expired")
        render json: { message: "Convite cancelado." }
      end

      private

      def set_household
        @household = @current_user.households.first
        return render json: { error: "Você não pertence a nenhuma família." }, status: :not_found unless @household
      end

      def serialize_invitation(invitation)
        {
          id: invitation.id,
          email: invitation.email,
          status: invitation.status,
          token: invitation.token,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at,
          invited_by: invitation.invited_by&.name
        }
      end
    end
  end
end
