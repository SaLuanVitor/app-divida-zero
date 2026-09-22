begin
  require 'faraday'
rescue LoadError
  # Pluggy congelado (ADR-0003): faraday pode não estar no bundle.
end
require 'json'

module FinancialProviders
  class Pluggy < Base
    class PluggyApiError < StandardError
      attr_reader :status, :body
      def initialize(message, status: nil, body: nil)
        super(message)
        @status = status
        @body = body
      end
    end

    class PluggyAuthError < PluggyApiError; end
    class PluggyRateLimitError < PluggyApiError; end
    class PluggyNotFoundError < PluggyApiError; end
    class PluggyServerError < PluggyApiError; end

    def initialize(config = {})
      @client_id = config[:client_id] || Setting.pluggy_client_id
      @client_secret = config[:client_secret] || Setting.pluggy_client_secret
      @base_url = config[:base_url] || Setting.pluggy_base_url
      @connect_url = config[:connect_url] || Setting.pluggy_connect_url
      @auth_token = nil
      @auth_token_expires_at = nil
      @conn = build_connection
    end

    def create_connection(user)
      response = post('/connect_token', { options: { clientUserId: user.id.to_s } })
      access_token = response['accessToken']
      {
        connect_token: access_token,
        connect_url: "#{@connect_url}/?connectToken=#{access_token}",
        item_id: response['itemId']
      }
    end

    def refresh_connection(connection)
      response = post("/items/#{connection.provider_item_id}/refresh")
      response
    end

    def disconnect_connection(connection)
      delete("/items/#{connection.provider_item_id}")
    end

    def accounts(connection)
      response = get("/accounts?itemId=#{connection.provider_item_id}")
      response['results'] || []
    end

    def transactions(connection, params = {})
      query_params = { itemId: connection.provider_item_id }
      query_params[:pageSize] = params[:page_size] || 500
      query_params[:page] = params[:page] || 1
      query_params[:updatedAfter] = params[:updated_after] if params[:updated_after]

      query_string = query_params.map { |k, v| "#{k}=#{v}" }.join('&')
      response = get("/transactions?#{query_string}")
      response['results'] || []
    end

    def institutions
      response = get('/connectors')
      response['results'] || []
    end

    def capabilities
      {
        accounts: true,
        transactions: true,
        credit_cards: true,
        investments: false,
        automatic_sync: true,
        manual_sync: true
      }
    end

    def ping
      response = get('/connectors?pageSize=1')
      response['results'].any?
    rescue Faraday::Error => e
      Rails.logger.error("Pluggy ping failed: #{e.message}")
      false
    end

    private

    def build_connection
      Faraday.new(url: @base_url) do |f|
        f.request :json
        f.response :json, content_type: /\bjson$/
        f.adapter Faraday.default_adapter
        f.options.timeout = 30
        f.options.open_timeout = 10
        # Retry middleware para chamadas idempotentes (GET)
        f.request :retry, max: 3, interval: 0.5, interval_randomness: 0.5,
                 backoff_factor: 2, retry_statuses: [429, 500, 502, 503, 504],
                 methods: [:get, :head]
      end
    end

    def auth_header
      refresh_token_if_needed
      { 'X-API-KEY' => @auth_token }
    end

    def refresh_token_if_needed
      return if @auth_token && @auth_token_expires_at && Time.current < @auth_token_expires_at
      fetch_auth_token
    end

    def fetch_auth_token
      response = @conn.post('/auth') do |req|
        req.headers['Content-Type'] = 'application/json'
        req.body = { clientId: @client_id, clientSecret: @client_secret }.to_json
      end
      handle_response(response).tap do |data|
        @auth_token = data['apiKey']
        expires_in = data['expiresIn'] || 7200 # default 2h
        @auth_token_expires_at = Time.current + expires_in - 60 # renovar 1min antes
      end
    end

    def get(path, params = {})
      handle_response(@conn.get(path, params, auth_header))
    end

    def post(path, body = {})
      handle_response(@conn.post(path, body, auth_header))
    end

    def delete(path)
      handle_response(@conn.delete(path, nil, auth_header))
    end

    def handle_response(response)
      case response.status
      when 200..299
        response.body
      when 401
        @auth_token = nil
        @auth_token_expires_at = nil
        raise PluggyAuthError.new('Invalid or expired credentials', status: 401, body: response.body)
      when 404
        raise PluggyNotFoundError.new('Resource not found', status: 404, body: response.body)
      when 429
        raise PluggyRateLimitError.new('Rate limited', status: 429, body: response.body)
      when 500..599
        raise PluggyServerError.new("Server error: #{response.status}", status: response.status, body: response.body)
      else
        raise PluggyApiError.new("HTTP #{response.status}: #{response.body}", status: response.status, body: response.body)
      end
    end
  end
end