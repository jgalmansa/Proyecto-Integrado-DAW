// backend/src/controllers/companyController.js
import Company from '../../models/company.js';
import User from '../../models/user.js';
import Domain from '../../models/domain.js';
import sequelize from '../../config/db.js';
import { generateInvitationCode } from '../utils/invitationCodeGenerator.js';

class CompanyController {
  /**
   * Registra una nueva empresa con su primer usuario administrador y dominios permitidos
   * @param {Object} req - Objeto de solicitud de Express
   * @param {Object} res - Objeto de respuesta de Express
   */
  async registerCompany(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { 
        companyName, 
        companyEmail, 
        companyPhone, 
        companyAddress,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPassword,
        domains 
      } = req.body;

      // Generar código de invitación único
      const invitationCode = await generateInvitationCode();

      // Validar que los dominios sean los mismos
      const extractDomain = (email) => {
        return email.split('@')[1].toLowerCase();
      };

      const companyDomain = extractDomain(companyEmail);
      const adminDomain = extractDomain(adminEmail);

      if (companyDomain !== adminDomain) {
        await transaction.rollback();
        return res.status(400).json({
          message: 'El correo de la empresa y del administrador deben tener el mismo dominio'
        });
      }

      // Crear la empresa
      const company = await Company.create({
        name: companyName,
        email: companyEmail,
        phone: companyPhone,
        address: companyAddress,
        invitation_code: invitationCode
      }, { transaction });

      // Crear el primer usuario administrador
      const adminUser = await User.create({
        company_id: company.id,
        first_name: adminFirstName,
        last_name: adminLastName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        is_active: true
      }, { transaction });

      // Crear dominios permitidos
      const domainEntries = (domains || [companyDomain]).map(domain => ({
        company_id: company.id,
        domain: domain.startsWith('@') ? domain : `@${domain}`,
        is_active: true
      }));

      await Domain.bulkCreate(domainEntries, { transaction });

      // Confirmar transacción
      await transaction.commit();

      // Respuesta sin información sensible
      res.status(201).json({
        message: 'Empresa registrada exitosamente',
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
          invitation_code: company.invitation_code
        },
        admin: {
          id: adminUser.id,
          name: `${adminUser.first_name} ${adminUser.last_name}`,
          email: adminUser.email
        }
      });

    } catch (error) {
      // Rollback de la transacción en caso de error
      await transaction.rollback();

      // Manejar errores específicos de validación
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          message: 'Ya existe una empresa o usuario con estos datos',
          errors: error.errors.map(e => e.message)
        });
      }

      if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
          message: 'Error de validación',
          errors: error.errors.map(e => e.message)
        });
      }

      // Error genérico
      console.error('Error al registrar empresa:', error);
      res.status(500).json({
        message: 'Error interno del servidor al registrar la empresa',
        error: error.message
      });
    }
  }

  /**
   * Verifica si un dominio está permitido para un nuevo registro
   * @param {Object} req - Objeto de solicitud de Express
   * @param {Object} res - Objeto de respuesta de Express
   */
  async checkDomainEligibility(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ 
          message: 'Correo electrónico es requerido' 
        });
      }

      // Extraer el dominio del correo
      const domain = email.split('@')[1].toLowerCase();
      const fullDomain = `@${domain}`;

      // Buscar el dominio en los dominios de empresas
      const companyDomain = await Domain.findOne({
        where: { 
          domain: fullDomain,
          is_active: true 
        },
        include: [{
          model: Company,
          as: 'company',
          attributes: ['id', 'name']
        }]
      });

      if (!companyDomain) {
        return res.status(404).json({ 
          message: 'Dominio no registrado',
          eligible: false 
        });
      }

      res.status(200).json({
        message: 'Dominio válido',
        eligible: true,
        company: {
          id: companyDomain.company.id,
          name: companyDomain.company.name
        }
      });

    } catch (error) {
      console.error('Error al verificar dominio:', error);
      res.status(500).json({
        message: 'Error interno del servidor al verificar dominio',
        error: error.message
      });
    }
  }
}

export default new CompanyController();