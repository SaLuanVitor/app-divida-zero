module Api
  module V1
    module Bank
      class TransactionsController < ApplicationController
        before_action :deprecated_notice

        def pending
          deprecated_notice
        end

        def accept
          deprecated_notice
        end

        def reject
          deprecated_notice
        end

        def merge
          deprecated_notice
        end

        private

        def deprecated_notice
          response.headers['Location'] = '/api/v1/financial/connections'
          render json: {
            error: 'Esta rota foi descontinuada.',
            message: 'Use GET/POST /api/v1/financial/connections/:id/transactions para gerenciar transações.',
            new_endpoint: '/api/v1/financial/connections/:id/transactions',
            sunset_date: '2026-12-31'
          }, status: :gone
        end
      end
    end
  end
end