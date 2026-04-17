const mongoose = require("mongoose");

let cachedSupport = null;

async function supportsMongoTransactions() {
  if (cachedSupport !== null) {
    return cachedSupport;
  }

  try {
    const admin = mongoose.connection.db.admin();
    const hello = await admin.command({ hello: 1 });

    cachedSupport = Boolean(hello.setName || hello.msg === "isdbgrid");
  } catch (_error) {
    cachedSupport = false;
  }

  return cachedSupport;
}

async function runWithOptionalTransaction(work) {
  const canUseTransactions = await supportsMongoTransactions();

  if (!canUseTransactions) {
    return work(null);
  }

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => work(session));
  } finally {
    await session.endSession();
  }
}

function sessionOptions(session) {
  return session ? { session } : {};
}

function withSession(query, session) {
  return session ? query.session(session) : query;
}

module.exports = {
  runWithOptionalTransaction,
  sessionOptions,
  supportsMongoTransactions,
  withSession,
};
