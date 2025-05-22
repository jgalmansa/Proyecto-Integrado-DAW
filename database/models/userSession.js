import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class UserSession extends Model {
  /**
   * Helper para verificar si la sesión está activa
   * @returns {boolean} - Verdadero si la sesión está activa
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Helper para marcar la sesión como inactiva (logout)
   * @returns {Promise<UserSession>} - La sesión actualizada
   */
  async deactivate() {
    this.status = 'inactive';
    return await this.save();
  }

  /**
   * Método estático para encontrar sesión activa por token
   * @param {string} token - Token de la sesión
   * @returns {Promise<UserSession|null>} - La sesión si existe y está activa
   */
  static async findActiveByToken(token) {
    return await this.findOne({
      where: {
        token: token,
        status: 'active'
      },
      include: ['user']
    });
  }

  /**
   * Método estático para invalidar todas las sesiones de un usuario
   * @param {number} userId - ID del usuario
   * @returns {Promise<number>} - Número de sesiones actualizadas
   */
  static async invalidateUserSessions(userId) {
    const [updatedCount] = await this.update(
      { status: 'inactive' },
      { 
        where: { 
          user_id: userId,
          status: 'active'
        } 
      }
    );
    return updatedCount;
  }
}

UserSession.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'expired'),
    allowNull: false,
    defaultValue: 'active'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  modelName: 'UserSession',
  tableName: 'user_sessions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export default UserSession;