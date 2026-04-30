module.exports = {
  apps: [
    {
      name: 'api-server',
      cwd: './artifacts/api-server',
      script: 'pnpm',
      args: 'run dev',
      env: {
        PORT: '8080',
        NODE_ENV: 'development',
        MONGODB_URI: 'mongodb+srv://sairajkoyande_db_user:5QlrqFxJrJmM9rR4@cluster0.akmevxg.mongodb.net/?appName=Cluster0',
        MONGODB_DB: 'apnaapp',
        DATALAB_API_KEY: 'Zgtv3ZTMRajX5sv5v9EqD81nsdUH0rfPwlWJd3SorTI',
      },
    },
    {
      name: 'doc-extractor',
      cwd: './artifacts/doc-extractor',
      script: 'pnpm',
      args: 'run dev',
      env: {
        PORT: '21926',
        BASE_PATH: '/',
        MONGODB_URI: 'mongodb+srv://sairajkoyande_db_user:5QlrqFxJrJmM9rR4@cluster0.akmevxg.mongodb.net/?appName=Cluster0',
        MONGODB_DB: 'apnaapp',
        DATALAB_API_KEY: 'Zgtv3ZTMRajX5sv5v9EqD81nsdUH0rfPwlWJd3SorTI',
      },
    },
  ],
};
