// services/db.js
const { CosmosClient } = require('@azure/cosmos');
require('dotenv').config();

const client = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY,
});

const database = client.database(process.env.COSMOS_DB_DATABASE);
const container = database.container(process.env.COSMOS_DB_CONTAINER);

async function saveMaterial(material) {
  const { resource } = await container.items.create(material, {
    partitionKey: material.created_by,
  });
  return resource;
}


async function findMaterials(query) {
  const q = query.toLowerCase();

  const sqlQuery = {
    query: `
      SELECT * FROM c
      WHERE CONTAINS(LOWER(c.originalTitle), @q)
        OR CONTAINS(LOWER(c.ukrTitle), @q)
        OR CONTAINS(LOWER(c.author), @q)
        OR CONTAINS(LOWER(c.category), @q)
        OR CONTAINS(LOWER(c.usefulness), @q)
    `,
    parameters: [{ name: '@q', value: q }]
  };

  const { resources } = await container.items.query(sqlQuery).fetchAll();
  return resources;
}

module.exports = {
  container,
  saveMaterial,
  findMaterials,
};