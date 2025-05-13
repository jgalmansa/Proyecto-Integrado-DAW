// backend/models/company.js
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class Company extends Model {}

Company.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: 'El nombre de la empresa es obligatorio'
      }
    }
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
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
    /**
     * Verifica si un número de teléfono tiene un formato válido
     * @param {string} value - Número de teléfono a validar
     * @throws {Error} Si el formato del teléfono no es válido
     * @returns {undefined}
     */
      isValidPhone(value) {
        // Si el valor es nulo o vacío, aceptarlo (porque allowNull: true)
        if (!value) return;
        
        // Validación más flexible: al menos 6 dígitos, puede tener +, -, espacio, ( ) y .
        const phoneRegex = /^[+]?[0-9\s()\-.]{6,20}$/;
        if (!phoneRegex.test(value)) {
          throw new Error('Formato de teléfono inválido');
        }
      }
    }
  },
  invitation_code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
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
  modelName: 'Company',
  tableName: 'companies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true
});

export default Company;