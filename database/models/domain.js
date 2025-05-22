// backend/models/domain.js
import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

class Domain extends Model {}

Domain.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  domain: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: {
        msg: 'El dominio no puede estar vacío'
      },
      customValidator(value) {
        // Asegurarse de que el dominio comience con @
        if (!value.startsWith('@')) {
          throw new Error('El dominio debe comenzar con @');
        }
        
        // Validar formato del dominio sin el @
        const domainPart = value.substring(1);
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
        if (!domainRegex.test(domainPart)) {
          throw new Error('Formato de dominio inválido');
        }
      }
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  modelName: 'Domain',
  tableName: 'domains',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  hooks: {
    // Asegurarse de que el dominio comience con @
    beforeValidate: (domain) => {
      if (domain.domain && !domain.domain.startsWith('@')) {
        domain.domain = `@${domain.domain}`;
      }
    }
  }
});

export default Domain;