'use strict';
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Verificamos si ya existen workspaces para las compañías
      const existingWorkspaces = await queryInterface.sequelize.query(
        `SELECT company_id, COUNT(*) as count FROM workspaces GROUP BY company_id;`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      // Creamos un mapa de compañías con workspaces existentes
      const companiesWithWorkspaces = new Map();
      existingWorkspaces.forEach(item => {
        companiesWithWorkspaces.set(item.company_id, item.count);
      });
      
      // Obtenemos todas las empresas
      const companies = await queryInterface.sequelize.query(
        `SELECT id FROM companies ORDER BY id;`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      // Lista de espacios a crear
      const workspaces = [];

      // Tipos de espacios de trabajo
      const workspaceTypes = [
        {
          name: 'Sala de Reuniones',
          description: 'Sala equipada para reuniones profesionales',
          capacity: 8,
          equipment: { 
            proyector: true, 
            pizarra: true, 
            videoconferencia: true,
            aire_acondicionado: true
          }
        },
        {
          name: 'Espacio Coworking',
          description: 'Espacio abierto para trabajo colaborativo',
          capacity: 15,
          equipment: { 
            wifi_alta_velocidad: true, 
            cafetería: true, 
            impresora: true,
            enchufes_múltiples: true
          }
        },
        {
          name: 'Sala de Conferencias',
          description: 'Espacio amplio para presentaciones y eventos',
          capacity: 30,
          equipment: { 
            sistema_sonido: true, 
            proyector_4k: true, 
            micrófonos: true,
            escenario: true
          }
        },
        {
          name: 'Despacho Privado',
          description: 'Oficina privada para equipos pequeños',
          capacity: 4,
          equipment: { 
            teléfono: true, 
            archivadores: true, 
            mini_nevera: true,
            caja_fuerte: true
          }
        },
        {
          name: 'Zona Creativa',
          description: 'Espacio para brainstorming y trabajo creativo',
          capacity: 10,
          equipment: { 
            pizarras_móviles: true, 
            mobiliario_flexible: true, 
            material_artístico: true,
            zona_relax: true
          }
        }
      ];

      // Para cada empresa, verificamos si necesitamos crear workspaces
      for (const company of companies) {
        // Si la empresa ya tiene 5 o más workspaces, la saltamos
        if (companiesWithWorkspaces.has(company.id) && companiesWithWorkspaces.get(company.id) >= 5) {
          console.log(`La empresa ID ${company.id} ya tiene ${companiesWithWorkspaces.get(company.id)} espacios de trabajo. Omitiendo.`);
          continue;
        }

        for (let i = 0; i < 5; i++) {
          const workspaceTemplate = workspaceTypes[i];
          const qrCode = null;
          
          workspaces.push({
            name: `${workspaceTemplate.name} ${i + 1}`,
            description: workspaceTemplate.description,
            capacity: workspaceTemplate.capacity,
            company_id: company.id,
            qr: qrCode,
            is_available: true,
            equipment: JSON.stringify(workspaceTemplate.equipment),
            created_at: new Date(),
            updated_at: new Date()
          });
        }
      }

      // Solo insertamos si hay workspaces para crear
      if (workspaces.length > 0) {
        await queryInterface.bulkInsert('workspaces', workspaces, {});
      }
    } catch (error) {
      console.error('Error al crear espacios de trabajo:', error);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Obtenemos las compañías para eliminar solo los workspaces asociados a ellas
      const companies = await queryInterface.sequelize.query(
        `SELECT id FROM companies;`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      const companyIds = companies.map(c => c.id);
      
      await queryInterface.bulkDelete('workspaces', {
        company_id: companyIds
      }, {});
    } catch (error) {
      console.error('Error al eliminar espacios de trabajo:', error);
    }
  }
};