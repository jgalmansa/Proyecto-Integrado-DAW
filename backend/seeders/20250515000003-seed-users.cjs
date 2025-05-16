'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Verificamos si ya existen usuarios para las compañías
      const existingUsers = await queryInterface.sequelize.query(
        `SELECT company_id, COUNT(*) as count FROM users GROUP BY company_id;`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      // Creamos un mapa de compañías con usuarios existentes
      const companiesWithUsers = new Map();
      existingUsers.forEach(item => {
        companiesWithUsers.set(item.company_id, item.count);
      });
      
      // Obtenemos todas las empresas
      const companies = await queryInterface.sequelize.query(
        `SELECT id, email FROM companies ORDER BY id;`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Lista de usuarios a crear
      const users = [];
      
      // Contraseña común para todos los usuarios de prueba
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Password123!', salt);

      // Para cada empresa, verificamos si necesitamos crear usuarios
      for (const company of companies) {
        // Si la empresa ya tiene 5 o más usuarios, la saltamos
        if (companiesWithUsers.has(company.id) && companiesWithUsers.get(company.id) >= 5) {
          console.log(`La empresa ID ${company.id} ya tiene ${companiesWithUsers.get(company.id)} usuarios. Omitiendo.`);
          continue;
        }
        
        const domainPart = company.email.split('@')[1];
        
        // Primer usuario: Administrador
        users.push({
          email: `administrador@${domainPart}`,
          password: hashedPassword,
          first_name: 'Admin',
          last_name: 'Usuario',
          company_id: company.id,
          role: 'admin',
          is_active: true,
          last_login: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        });

        // Cuatro usuarios normales
        for (let i = 1; i <= 4; i++) {
          users.push({
            email: `user${i}@${domainPart}`,
            password: hashedPassword,
            first_name: `Usuario ${i}`,
            last_name: `Apellido ${i}`,
            company_id: company.id,
            role: 'user',
            is_active: true,
            last_login: null,
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      // Solo insertamos si hay usuarios para crear
      if (users.length > 0) {
        await queryInterface.bulkInsert('users', users, {});
      }
    } catch (error) {
      console.error('Error al crear usuarios:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Obtenemos las compañías para eliminar solo los usuarios asociados a ellas
      const companies = await queryInterface.sequelize.query(
        `SELECT id FROM companies;`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      const companyIds = companies.map(c => c.id);
      
      await queryInterface.bulkDelete('users', {
        company_id: companyIds
      }, {});
    } catch (error) {
      console.error('Error al eliminar usuarios:', error);
    }
  }
};