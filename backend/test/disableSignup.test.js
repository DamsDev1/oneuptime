/* eslint-disable no-undef */

process.env.PORT = 3020;
process.env.IS_SAAS_SERVICE = true;
const expect = require('chai').expect;
const data = require('./data/user');
const chai = require('chai');
chai.use(require('chai-http'));
const app = require('../server');
const GlobalConfig = require('./utils/globalConfig');
const request = chai.request.agent(app);
const { createUser } = require('./utils/userSignUp');
const UserService = require('../backend/services/userService');
const AirtableService = require('../backend/services/airtableService');
const payment = require('../backend/config/payment');
const stripe = require('stripe')(payment.paymentPrivateKey);

describe('Disable Sign up test', function() {
    this.timeout(200000);
    let token = null;
    this.beforeAll(async function() {
        this.timeout(400000);
        await GlobalConfig.removeTestConfig();
        await UserService.hardDeleteBy({});
        await AirtableService.deleteAll({ tableName: 'User' });
        await GlobalConfig.initTestConfig();
        const user = await createUser(request, data.adminUser);
        await UserService.updateBy(
            { _id: user.body.id },
            { role: 'master-admin' }
        );
        const res = await request.post('/user/login').send({
            email: data.adminUser.email,
            password: data.adminUser.password,
        });
        token = res.body.tokens.jwtAccessToken;
        process.env.DISABLE_SIGNUP = 'true'; // this is in quotes because of helm chart and kubernetes.
    });

    this.afterAll(async () => {
        await GlobalConfig.removeTestConfig();
        await UserService.hardDeleteBy({});
        await AirtableService.deleteAll({ tableName: 'User' });
        process.env.DISABLE_SIGNUP = undefined;
    });

    it('should not sign up the user when sign up is disabled', done => {
        createUser(request, data.user, function(err) {
            if (
                err &&
                err.response &&
                err.response.body &&
                err.response.body.message
            ) {
                expect(err.response.body.message).to.be.equals(
                    'Sign up is disabled.'
                );
                done();
            } else {
                done(new Error('User signed up'));
            }
        });
    });

    it('should sign up a new when user is admin.', done => {
        const authorization = `Basic ${token}`;
        request
            .post('/stripe/checkCard')
            .send({
                tokenId: 'tok_visa',
                email: data.anotherUser.email,
                companyName: data.anotherUser.companyName,
            })
            .end(function(err, res) {
                stripe.paymentIntents.confirm(res.body.id, function(
                    err,
                    paymentIntent
                ) {
                    request
                        .post('/user/signup')
                        .set('Authorization', authorization)
                        .send({
                            paymentIntent: {
                                id: paymentIntent.id,
                            },
                            ...data.anotherUser,
                        })
                        .end(function(err) {
                            if (err) {
                                done(err);
                            } else {
                                done();
                            }
                        });
                });
            });
    });
});
