'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Primero verificamos si ya existen dominios para evitar duplicados
      const existingDomains = await queryInterface.sequelize.query(
        `SELECT domain FROM domains;`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      // Creamos un conjunto de dominios existentes para búsqueda rápida
      const existingDomainSet = new Set(existingDomains.map(d => d.domain));
      
      // Obtenemos las empresas
      const companies = await queryInterface.sequelize.query(
        `SELECT id, email FROM companies ORDER BY id LIMIT 5;`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Lista de dominios a crear
      const domains = [];

      // Creamos el dominio basado en el email de cada empresa
      companies.forEach((company, index) => {
        const domainPart = company.email.split('@')[1];
        let domainName = `@${domainPart}`;
        
        // Si el dominio ya existe, creamos una variante con un sufijo numérico
        if (existingDomainSet.has(domainName)) {
          domainName = `@${index+1}.${domainPart}`;
        }
        
        domains.push({
          company_id: company.id,
          domain: domainName,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      });

      // Solo insertamos si hay dominios para crear
      if (domains.length > 0) {
        await queryInterface.bulkInsert('domains', domains, {});
      }
    } catch (error) {
      console.error('Error al crear dominios:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    // Eliminar solo los dominios que corresponden a las empresas de este seeder
    const companies = await queryInterface.sequelize.query(
      `SELECT id FROM companies ORDER BY id LIMIT 5;`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const companyIds = companies.map(c => c.id);
    
    await queryInterface.bulkDelete('domains', {
      company_id: companyIds
    }, {});
  }
};