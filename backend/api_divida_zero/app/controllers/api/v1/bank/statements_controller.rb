module Api
  module V1
    module Bank
      class StatementsController < ApplicationController
        before_action :deprecated_notice

        def upload
          deprecated_notice
        end

        def destroy
          deprecated_notice
        end

        def status
          deprecated_notice
        end

        private

        def deprecated_notice
          response.headers['Location'] = '/api/v1/financial/connections'
          render json: {
            error: 'Esta rota foi descontinuada.',
            message: 'Use POST /api/v1/financial/connections para importar extratos.',
            new_endpoint: '/api/v1/financial/connections',
            sunset_date: '2026-12-31'
          }, status: :gone  # 410 Gone
        end
      end
    end
  end
end