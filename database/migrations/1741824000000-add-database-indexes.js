// Migration: Adds database indexes for improved query performance.

module.exports = {
   up: (queryInterface) => {
      return queryInterface.sequelize.transaction(async (t) => {
         try {
            // Keyword table indexes
            await queryInterface.addIndex('keyword', ['domain'], {
               name: 'idx_keyword_domain',
               transaction: t,
            }).catch(() => {});

            await queryInterface.addIndex('keyword', ['lastUpdated'], {
               name: 'idx_keyword_lastUpdated',
               transaction: t,
            }).catch(() => {});

            await queryInterface.addIndex('keyword', ['updating'], {
               name: 'idx_keyword_updating',
               transaction: t,
            }).catch(() => {});

            // Domain table indexes
            await queryInterface.addIndex('domain', ['notification'], {
               name: 'idx_domain_notification',
               transaction: t,
            }).catch(() => {});

            await queryInterface.addIndex('domain', ['lastUpdated'], {
               name: 'idx_domain_lastUpdated',
               transaction: t,
            }).catch(() => {});
         } catch (error) {
            // Indexes may already exist, ignore errors
         }
      });
   },
   down: (queryInterface) => {
      return queryInterface.sequelize.transaction(async (t) => {
         try {
            await queryInterface.removeIndex('keyword', 'idx_keyword_domain', { transaction: t }).catch(() => {});
            await queryInterface.removeIndex('keyword', 'idx_keyword_lastUpdated', { transaction: t }).catch(() => {});
            await queryInterface.removeIndex('keyword', 'idx_keyword_updating', { transaction: t }).catch(() => {});
            await queryInterface.removeIndex('domain', 'idx_domain_notification', { transaction: t }).catch(() => {});
            await queryInterface.removeIndex('domain', 'idx_domain_lastUpdated', { transaction: t }).catch(() => {});
         } catch (error) {
            // Ignore errors during rollback
         }
      });
   },
};
