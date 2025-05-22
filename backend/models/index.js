import Company from './company.js';
import User from './user.js';
import UserSession from './userSession.js';
import Domain from './domain.js';
import Workspace from './workspace.js';
import Reservation from './reservation.js';
import Notification from './notification.js';
import sequelize from '../config/db.js';

// Definir las asociaciones entre modelos

// Relaciones Company
Company.hasMany(User, { foreignKey: 'company_id' });
Company.hasMany(Domain, { foreignKey: 'company_id' });
Company.hasMany(Workspace, { foreignKey: 'company_id' });

// Relaciones User
User.belongsTo(Company, { foreignKey: 'company_id' });
User.hasMany(Reservation, { foreignKey: 'user_id' });
User.hasMany(Notification, { foreignKey: 'user_id' });
User.hasMany(UserSession, { foreignKey: 'user_id', as: 'sessions' });

// Relaciones UserSession
UserSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Relaciones Domain
Domain.belongsTo(Company, { foreignKey: 'company_id' });

// Relaciones Workspace
Workspace.belongsTo(Company, { foreignKey: 'company_id' });
Workspace.hasMany(Reservation, { foreignKey: 'workspace_id' });

// Relaciones Reservation
Reservation.belongsTo(User, { foreignKey: 'user_id' });
Reservation.belongsTo(Workspace, { foreignKey: 'workspace_id' });
Reservation.hasMany(Notification, { foreignKey: 'reservation_id' });

// Relaciones Notification
Notification.belongsTo(User, { foreignKey: 'user_id' });
Notification.belongsTo(Reservation, { foreignKey: 'reservation_id', allowNull: true });

export {
  sequelize,
  Company,
  User,
  UserSession,
  Domain,
  Workspace,
  Reservation,
  Notification
};