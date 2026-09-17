module Api
  module V1
    class InvitationsController < ApplicationController
      before_action :authenticate_access_token!

      def pending
        invitations = HouseholdInvitation.pending
          .where(email: @current_user.email)
          .where("expires_at > ?", Time.current)
          .order(created_at: :desc)

        render json: { invitations: invitations.map { |i| serialize_invitation(i) } }
      end

      def accept
        invitation = HouseholdInvitation.pending.find_by!(token: params[:token])

        if invitation.expired?
          invitation.update!(status: "expired")
          return render json: { error: "Convite expirou." }, status: :gone
        end

        if invitation.email != @current_user.email
          return render json: { error: "Este convite não é para você." }, status: :forbidden
        end

        if @current_user.households.exists?(id: invitation.household_id)
          return render json: { error: "Você já é membro desta família." }, status: :conflict
        end

        ActiveRecord::Base.transaction do
          invitation.accept!
          invitation.household.household_memberships.create!(
            user: @current_user,
            role: "member",
            joined_at: Time.current
          )
        end

        household = invitation.household
        render json: {
          message: "Você entrou na família #{household.name}.",
          household: { id: household.id, name: household.name }
        }
      end

      def decline
        invitation = HouseholdInvitation.pending.find_by!(token: params[:token])

        if invitation.email != @current_user.email
          return render json: { error: "Este convite não é para você." }, status: :forbidden
        end

        invitation.decline!
        render json: { message: "Convite recusado." }
      end

      private

      def serialize_invitation(invitation)
        {
          id: invitation.id,
          token: invitation.token,
          household_name: invitation.household.name,
          invited_by: invitation.invited_by&.name,
          expires_at: invitation.expires_at,
          created_at: invitation.created_at
        }
      end
    end
  end
end
