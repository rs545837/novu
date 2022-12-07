import { UserSession } from '@novu/testing';
import * as jwt from 'jsonwebtoken';
import { expect } from 'chai';
import { IJwtPayload } from '@novu/shared';

describe('User login - /auth/login (POST)', async () => {
  let session: UserSession;
  const userCredentials = {
    email: 'Testy.test22@gmail.com',
    password: '123456789',
  };

  before(async () => {
    session = new UserSession();
    await session.initialize();

    const { body } = await session.testAgent
      .post('/v1/auth/register')
      .send({
        email: userCredentials.email,
        password: userCredentials.password,
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);
  });

  it('should login the user correctly', async () => {
    const { body } = await session.testAgent.post('/v1/auth/login').send({
      email: userCredentials.email,
      password: userCredentials.password,
    });

    const jwtContent = (await jwt.decode(body.data.token)) as IJwtPayload;

    expect(jwtContent.firstName).to.equal('test');
    expect(jwtContent.lastName).to.equal('user');
    expect(jwtContent.email).to.equal('testytest22@gmail.com');
  });

  it('should login the user correctly with uppercase email', async () => {
    const { body } = await session.testAgent.post('/v1/auth/login').send({
      email: userCredentials.email.toUpperCase(),
      password: userCredentials.password,
    });

    const jwtContent = (await jwt.decode(body.data.token)) as IJwtPayload;

    expect(jwtContent.firstName).to.equal('test');
    expect(jwtContent.lastName).to.equal('user');
    expect(jwtContent.email).to.equal('testytest22@gmail.com');
  });

  it('should fail on bad password', async () => {
    const { body } = await session.testAgent.post('/v1/auth/login').send({
      email: userCredentials.email,
      password: '123123213123',
    });

    expect(body.statusCode).to.equal(400);
    expect(body.message).to.contain('Wrong credentials provided');
  });

  it('should allow user to log in and reset the failed attempts counter after less than 5 failed attempts within 5 minutes', async () => {
    const SAFE_FAILED_LOGIN_ATTEMPTS = 3;

    for (let i = 0; i < SAFE_FAILED_LOGIN_ATTEMPTS; i++) {
      await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email,
        password: 'wrong-password',
      });
    }

    const { body } = await session.testAgent.post('/v1/auth/login').send({
      email: userCredentials.email,
      password: userCredentials.password,
    });

    const jwtContent = (await jwt.decode(body.data.token)) as IJwtPayload;

    expect(jwtContent.firstName).to.equal('test');
    expect(jwtContent.lastName).to.equal('user');
    expect(jwtContent.email).to.equal('testytest22@gmail.com');

    const { body: wrongCredsBody } = await session.testAgent.post('/v1/auth/login').send({
      email: userCredentials.email,
      password: 'wrong-password',
    });

    expect(wrongCredsBody.statusCode).to.equal(400);
    expect(wrongCredsBody.message).to.contain('Wrong credentials provided');
  });

  it('should block the user account after 5 unsuccessful attempts within 5 minutes', async () => {
    const MAX_LOGIN_ATTEMPTS = 5;

    for (let i = 0; i < MAX_LOGIN_ATTEMPTS; i++) {
      await session.testAgent.post('/v1/auth/login').send({
        email: userCredentials.email,
        password: 'wrong-password',
      });
    }

    const { body } = await session.testAgent.post('/v1/auth/login').send({
      email: userCredentials.email,
      password: userCredentials.password,
    });

    expect(body.statusCode).to.equal(401);
    expect(body.message).to.contain('Account blocked');
  });
});
