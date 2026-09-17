module Api
  module V1
    module Bank
      class StatementsController < ApplicationController
        MAX_FILE_SIZE = 10.megabytes
        ALLOWED_EXTENSIONS = %w[.ofx .qfx .csv].freeze

        before_action :authenticate_access_token!

        def upload
          file = params[:file]
          return render_json_error("Arquivo é obrigatório.", :unprocessable_entity) unless file.present?

          ext = File.extname(file.original_filename).downcase
          return render_json_error("Formato não suportado. Use OFX ou CSV.", :unprocessable_entity) unless ALLOWED_EXTENSIONS.include?(ext)
          return render_json_error("Arquivo muito grande. Máximo: 10MB.", :unprocessable_entity) if file.size > MAX_FILE_SIZE

          batch_id = SecureRandom.uuid
          Rails.cache.write(batch_cache_key(batch_id), { step: "parsing", progress: 0 }, expires_in: 24.hours)
          temp_dir = Rails.root.join("tmp", "imports", batch_id)
          FileUtils.mkdir_p(temp_dir)
          temp_path = temp_dir.join(file.original_filename)
          File.open(temp_path, "wb") { |f| f.write(file.read) }

          StatementParseJob.perform_later(
            batch_id: batch_id,
            file_path: temp_path.to_s,
            user_id: @current_user.id
          )

          render json: {
            batch_id: batch_id,
            status: "processing",
            message: "Importação iniciada. Use o batch_id para acompanhar."
          }, status: :accepted
        end

        def destroy
          batch_id = params[:batch_id]
          return render_json_error("batch_id é obrigatório.", :unprocessable_entity) if batch_id.blank?

          deleted = @current_user.imported_transactions
                                 .where(import_batch_id: batch_id)
                                 .destroy_all

          render json: { deleted: deleted.size }, status: :ok
        end

        def status
          batch_id = params[:batch_id]
          return render json: { error: "batch_id é obrigatório." }, status: :unprocessable_entity if batch_id.blank?

          batch_cache = Rails.cache.read(batch_cache_key(batch_id))
          failed = batch_cache if batch_cache&.dig(:error)

          if failed
            return render json: {
              batch_id: batch_id,
              status: "error",
              error: failed[:error]
            }, status: :ok
          end

          queued = false
          if SolidQueue::Job.table_exists?
            queued = SolidQueue::Job.where("arguments LIKE ?", "%#{batch_id}%").exists?
          end
          has_batch = batch_cache.present? || queued ||
                      @current_user.imported_transactions.where(import_batch_id: batch_id).exists?

          unless has_batch
            return render json: { error: "Importação não encontrada." }, status: :not_found
          end

          transactions = @current_user.imported_transactions.where(import_batch_id: batch_id)

          if transactions.empty?
            return render json: {
              batch_id: batch_id,
              status: "processing",
              step: batch_cache&.dig(:step) || "parsing",
              progress: batch_cache&.dig(:progress) || 0
            }, status: :ok
          end

          render json: {
            batch_id: batch_id,
            status: "done",
            step: batch_cache&.dig(:step) || "done",
            progress: batch_cache&.dig(:progress) || 100,
            total: transactions.count,
            pending: transactions.pending.count,
            duplicates: transactions.duplicate.count
          }, status: :ok
        end

        private

        def batch_cache_key(batch_id)
          "bank_import_batch:#{batch_id}"
        end

        def render_json_error(message, status)
          render json: { error: message }, status: status
        end

        def authenticate_access_token!
          super
        end
      end
    end
  end
end
