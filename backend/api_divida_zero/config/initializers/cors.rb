allowed_origins = ENV.fetch("CORS_ALLOWED_ORIGINS", "http://localhost:8081,http://localhost:3000").split(",").map(&:strip)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed_origins) if allowed_origins.present?

    resource "*",
             headers: :any,
             methods: %i[get post put patch delete options head],
             expose: ["Authorization"]
  end
end
