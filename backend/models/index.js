import Company from './company.js';
import User from './user.js';
import Domain from './domain.js';
import Workspace from './workspace.js';
import Reservation from './reservation.js';
import Notification from './notification.js';

// Asociaciones entre Company y User
Company.hasMany(User, { 
  foreignKey: 'company_id',
  as: 'users'
});
User.belongsTo(Company, { 
  foreignKey: 'company_id',
  as: 'company'
});

// Asociaciones entre Company y Domain
Company.hasMany(Domain, { 
  foreignKey: 'company_id',
  as: 'domains'
});
Domain.belongsTo(Company, { 
  foreignKey: 'company_id',
  as: 'company'
});

// Asociaciones entre Company y Workspace
Company.hasMany(Workspace, { 
  foreignKey: 'company_id',
  as: 'workspaces'
});
Workspace.belongsTo(Company, { 
  foreignKey: 'company_id',
  as: 'company'
});

// Asociaciones entre User y Reservation
User.hasMany(Reservation, { 
  foreignKey: 'user_id',
  as: 'reservations'
});
Reservation.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user'
});

// Asociaciones entre Workspace y Reservation
Workspace.hasMany(Reservation, { 
  foreignKey: 'workspace_id',
  as: 'reservations'
});
Reservation.belongsTo(Workspace, { 
  foreignKey: 'workspace_id',
  as: 'workspace'
});

// Asociaciones entre User y Notification
User.hasMany(Notification, { 
  foreignKey: 'user_id',
  as: 'notifications'
});
Notification.belongsTo(User, { 
  foreignKey: 'user_id',
  as: 'user'
});

// Asociaciones entre Reservation y Notification
Reservation.hasMany(Notification, { 
  foreignKey: 'reservation_id',
  as: 'notifications'
});
Notification.belongsTo(Reservation, { 
  foreignKey: 'reservation_id',
  as: 'reservation'
});

export {
  Company,
  User,
  Domain,
  Workspace,
  Reservation,
  Notification
};