import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import bcrypt from 'bcryptjs';

class User extends Model {
  /**
   * Helper para verificar si el usuario es administrador
   * @returns {boolean} - Verdadero si el usuario es admin
   */
  isAdmin() {
    return this.role === 'admin';
  }

  /**
   * Helper para comparar contraseñas
   * @param {string} password - Contraseña en texto plano para comparar
   * @returns {Promise<boolean>} - Verdadero si la contraseña coincide
   */
  async comparePassword(password) {
    return bcrypt.compare(password, this.password);
  }

  /**
   * Helper para obtener sesiones activas del usuario
   * @returns {Promise<UserSession[]>} - Array de sesiones activas
   */
  async getActiveSessions() {
    const UserSession = sequelize.models.UserSession;
    return await UserSession.findAll({
      where: {
        user_id: this.id,
        status: 'active'
      }
    });
  }

  /**
   * Helper para invalidar todas las sesiones del usuario
   * @returns {Promise<number>} - Número de sesiones invalidadas
   */
  async invalidateAllSessions() {
    const UserSession = sequelize.models.UserSession;
    const [updatedCount] = await UserSession.update(
      { status: 'inactive' },
      { 
        where: { 
          user_id: this.id,
          status: 'active'
        } 
      }
    );
    return updatedCount;
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: {
        msg: 'Formato de correo electrónico inválido'
      }
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      len: {
        args: [8, 255],
        msg: 'La contraseña debe tener al menos 8 caracteres'
      }
    }
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      isIn: {
        args: [['admin', 'user']],
        msg: 'El rol debe ser "admin" o "user"'
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  hooks: {
    
    /**
     * Hook para hashear la contraseña antes de crear un usuario
     * Genera un hash de la contraseña utilizando bcrypt y lo asigna al usuario
     * @param {User} user - Instancia de User que se va a crear
     * @returns {Promise<void>}
     */
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    
    /**
     * Hook para hashear la contraseña antes de actualizar
     * Si se ha modificado la contraseña, se genera un hash con ella
     * @param {User} user - Instancia de User que se va a actualizar
     * @returns {Promise<void>}
     */
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

export default User;