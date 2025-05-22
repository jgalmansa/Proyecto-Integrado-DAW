'use strict';
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Verificamos si ya existen empresas para evitar insertar duplicados
      const existingCompanies = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM companies;`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      // Si ya hay empresas, no insertamos más
      if (existingCompanies[0].count > 0) {
        console.log(`Ya existen ${existingCompanies[0].count} empresas en la base de datos. Omitiendo seeder de empresas.`);
        return;
      }
      
      // Generamos códigos de invitación únicos
      const generateInvitationCode = (name) => {
        const prefix = name.substring(0, 2).toUpperCase();
        const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `${prefix}-${randomStr}-INVITE`;
      };
      
      await queryInterface.bulkInsert('companies', [
        {
          name: 'TechHub Solutions',
          email: 'admin@techhub.com',
          address: 'Calle Gran Vía, 28, 28013 Madrid',
          phone: '+34 912 345 678',
          invitation_code: generateInvitationCode('TechHub'),
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Innovate Coworking',
          email: 'admin@innovate.es',
          address: 'Avenida Diagonal, 211, 08018 Barcelona',
          phone: '+34 933 456 789',
          invitation_code: generateInvitationCode('Innovate'),
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Digital Space',
          email: 'admin@digitalspace.com',
          address: 'Calle Sierpes, 45, 41004 Sevilla',
          phone: '+34 954 567 890',
          invitation_code: generateInvitationCode('Digital'),
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Workspace Pro',
          email: 'admin@workspacepro.es',
          address: 'Rúa do Príncipe, 32, 36202 Vigo',
          phone: '+34 986 678 901',
          invitation_code: generateInvitationCode('Workspace'),
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          name: 'Creative Labs',
          email: 'admin@creativelabs.com',
          address: 'Calle Colón, 50, 46004 Valencia',
          phone: '+34 963 789 012',
          invitation_code: generateInvitationCode('Creative'),
          created_at: new Date(),
          updated_at: new Date()
        }
      ], {});
    } catch (error) {
      console.error('Error al crear empresas:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('companies', null, {});
  }
};