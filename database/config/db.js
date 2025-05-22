import { Sequelize } from 'sequelize';
import config from './config.js';

const env = process.env.NODE_ENV || 'development';
const cfg = config[env];

const sequelize = new Sequelize(
  cfg.database,
  cfg.username,
  cfg.password,
  {
    host: cfg.host,
    port: cfg.port,
    dialect: cfg.dialect,
    logging: cfg.logging
  }
);

export default sequelize;
