const validEnvs = ['local', 'development', 'production'];

module.exports = (env) => {
  if (!validEnvs.includes(env)) {
    throw new Error(`invalid environment ${env}, valid environments are ${validEnvs.join('|')}`);
  }

  if (env === 'local') {
    return {
      socket: {
        port: 8000,
      },
      rest: {
        port: 9000,
      },
    };
  }
  if (env === 'development') {
    return {
      socket: {
        port: 8000,
      },
      rest: {
        port: 9000,
      },
    };
  }
  return {
    socket: {
      port: 8000,
    },
    rest: {
      port: 9000,
    },
  };
};
