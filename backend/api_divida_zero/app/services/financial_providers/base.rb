module FinancialProviders
  class Base
    def initialize(config = {})
      @config = config
    end

    def create_connection(user)
      raise NotImplementedError, "#{self.class} must implement #create_connection"
    end

    def refresh_connection(connection)
      raise NotImplementedError, "#{self.class} must implement #refresh_connection"
    end

    def disconnect_connection(connection)
      raise NotImplementedError, "#{self.class} must implement #disconnect_connection"
    end

    def accounts(connection)
      raise NotImplementedError, "#{self.class} must implement #accounts"
    end

    def transactions(connection, params = {})
      raise NotImplementedError, "#{self.class} must implement #transactions"
    end

    def institutions
      raise NotImplementedError, "#{self.class} must implement #institutions"
    end

    def capabilities
      raise NotImplementedError, "#{self.class} must implement #capabilities"
    end

    def ping
      raise NotImplementedError, "#{self.class} must implement #ping"
    end
  end
end