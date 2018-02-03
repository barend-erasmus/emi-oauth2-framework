// http://localhost:3000/auth/authorize?response_type=code&client_id=0zyrWYATtw&redirect_uri=http://localhost:3000/auth/passport/callback&state=40335
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as path from 'path';
import * as yargs from 'yargs';
import * as request from 'request-promise';
import * as cors from 'cors';
import * as winston from 'winston';
import * as jsonwebtoken from 'jsonwebtoken';
import * as ActiveDirectory from 'activedirectory';
import { Client, OAuth2FrameworkRouter, OAuth2FrameworkError } from 'oauth2-framework';
import { Token } from 'oauth2-framework/dist/models/token';

const argv = yargs.argv;
const app = express();

winston.add(winston.transports.File, { filename: path.join(__dirname, 'emi-oauth2-framework.log') });

app.set('trust proxy', true);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.use('/auth', OAuth2FrameworkRouter(
    {
        findClient: (clientId: string) => {
            if (clientId === '0zyrWYATtw') {
                return Promise.resolve(new Client(
                    'Parking App',
                    '0zyrWYATtw',
                    'x3h8CTB2Cj',
                    [], [
                        'http://localhost:4200/#/callback',
                        'http://parkingapp.euromonitor.local/web/#/callback'
                    ],
                    false,
                    false,
                ));
            } else if (clientId === '88MHne8ije') {
                return Promise.resolve(new Client(
                    'Internal - Passport',
                    '88MHne8ije',
                    'KI69NoJ0uO',
                    [],
                    [
                        'http://localhost:3000/auth/passport/callback',
                        'http://cpt.innovation.euromonitor.local/auth/passport/callback',
                        'http://localhost:4200/callback',
                        'http://parkingapp.euromonitor.local/web/callback'],
                    true,
                    false,
                ));
            } else if (clientId === 'FUmCsF9c2D') {
                return Promise.resolve(new Client(
                    'Feature Toggle',
                    'FUmCsF9c2D',
                    '4vmPj7eGVp',
                    ['admin'],
                    [
                        'http://localhost:4200/callback',
                        'http://192.168.46.102:9002/callback',
                        'http://feature-toggle.euromonitor.local/callback'
                    ],
                    true,
                    false,
                ));
            } else {
                return Promise.resolve(null);
            }
        },
        generateAccessToken: (client_id: string, userName: string, scopes: string[], request: express.Request) => {
            const token = jsonwebtoken.sign({
                client_id,
                scopes,
                type: 'access-token',
                userName,
             }, 'rRUz_NC^2qb=X8Xt7BRj');

            return Promise.resolve(token);
        },
        generateCode: (client_id: string, userName: string, scopes: string[], request: express.Request) => {
            const code = jsonwebtoken.sign({
                client_id,
                scopes,
                type: 'code',
                userName,
             }, 'rRUz_NC^2qb=X8Xt7BRj');

            return Promise.resolve(code);
        },
        register: (client_id: string, emailAddress: string, userName: string, password: string, request: express.Request) => {
            return Promise.resolve(null);
        },
        resetPassword: (client_id: string, userName: string, password: string, request: express.Request) => {
            return Promise.resolve(null);
        },
        sendForgotPasswordEmail: (client_id: string, userName: string, resetPasswordUrl: string, request: express.Request) => {
            return Promise.resolve(null);
        },
        sendVerificationEmail: (client_id: string, emailAddress: string, userName: string, verificationUrl: string, request: express.Request) => {
            return Promise.resolve(null);
        },
        validateAccessToken: (access_token: string, request: express.Request) => {

            const decodedToken = jsonwebtoken.decode(access_token);

            if (decodedToken.type !== 'access-token') {
                throw new OAuth2FrameworkError('invalid_access_token', 'Invalid Access Token');
            }
            
            return Promise.resolve(new Token(
                decodedToken.client_id,
                decodedToken.userName,
                decodedToken.scopes,
            ));
        },
        validateCode: (code: string, request: express.Request) => {
            const decodedToken = jsonwebtoken.decode(code);

            if (decodedToken.type !== 'code') {
                throw new OAuth2FrameworkError('invalid_code', 'Invalid Code');
            }
            
            return Promise.resolve(new Token(
                decodedToken.client_id,
                decodedToken.userName,
                decodedToken.scopes,
            ));
        },
        validateCredentials: (clientId: string, userName: string, password: string) => {
            return new Promise((resolve: (result: boolean) => void, reject: (err: Error) => void) => {
                winston.info(`validateCredentials('${clientId}', '${userName}', '${password}')`);

                const configuration = {
                    url: 'ldap://EUROCT1.euromonitor.local',
                    baseDN: 'dc=euromonitor,dc=local',
                    userName: `${userName}@euromonitor.local`,
                    password,
                };

                const ad = new ActiveDirectory(configuration);

                ad.authenticate(`${userName}@euromonitor.local`, password, (err: Error, auth: any) => {
                    if (err) {
                        resolve(false);
                    } else if (auth) {
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                });
            });
        },
        verify: (client_id: string, userName: string, request: express.Request) => {
            return Promise.resolve(null);
        },
    },
    path.join(__dirname, 'views/login.handlebars'),
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'rRUz_NC^2qb=X8Xt7BRj',
));


app.get('/auth/passport/callback', async (req: express.Request, res: express.Response) => {

    const client_id = '88MHne8ije';
    const client_secret = 'KI69NoJ0uO';
    const redirect_uri = argv.prod ? 'http://cpt.innovation.euromonitor.local/auth/passport/callback' : 'http://localhost:3000/auth/passport/callback';
    const trinityApiUri = 'http://trinity.euromonitor.com';

    const response1 = await request({
        body: {
            client_id: client_id,
            client_secret: client_secret,
            code: req.query.code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
        },
        method: 'POST',
        uri: argv.prod ? `http://cpt.innovation.euromonitor.local/auth/token` : `http://localhost:3000/auth/token`,
        json: true,
        resolveWithFullResponse: true,
    });

    if (response1.statusCode !== 200) {
        res.status(500).json({

        });
        return;
    }

    const response2 = await request({
        method: 'GET',
        uri: argv.prod ? `http://cpt.innovation.euromonitor.local/auth/user` : `http://localhost:3000/auth/user`,
        headers: {
            Authorization: `Bearer ${response1.body.access_token}`,
        },
        json: true,
        resolveWithFullResponse: true,
    });

    if (response2.statusCode !== 200) {
        res.status(500).json({

        });
        return;
    }

    const response3 = await request({
        method: 'POST',
        uri: `${trinityApiUri}/api/auth/token`,
        body: {
            SubscriberId: req.query.state,
            Username: `EURO_NT\\${response2.body.userName}`,
            ApplicationId: 1,
        },
        json: true,
        resolveWithFullResponse: true,
    });

    if (response3.statusCode !== 200) {

        res.status(500).json({

        });
        return;
    }

    res.redirect(`http://portal.euromonitor.com/Portal?ClearClaim=true&AuthToken=${response3.body}`);
});

app.listen(argv.port || 3000, () => {
    console.log(`listening on port ${argv.port || 3000}`);
});