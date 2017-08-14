// http://localhost:3000/auth/authorize?response_type=code&client_id=0zyrWYATtw&redirect_uri=http://localhost:3000/auth/passport/callback&state=40335

// Imports
import * as co from 'co';
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as path from 'path';
import * as yargs from 'yargs';
import * as request from 'request-promise';

import * as ActiveDirectory from 'activedirectory';

import { Client, OAuth2FrameworkRouter } from 'oauth2-framework';

const argv = yargs.argv;
const app = express();

app.set('trust proxy', true);

// Configures middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/auth', OAuth2FrameworkRouter(
    {
        findClient: (clientId: string) => {
            if (clientId === '0zyrWYATtw') {
                return Promise.resolve(new Client('Euromonitor International', '0zyrWYATtw', 'x3h8CTB2Cj', [], ['http://localhost:3000/auth/passport/callback', 'http://cpt.innovation.euromonitor.local/auth/passport/callback', 'http://localhost:4200/callback'], true));
            } else {
                return Promise.resolve(null);
            }
        },
        resetPassword: null,
        sendForgotPasswordEmail: null,
        validateCredentials: (clientId: string, username: string, password: string) => {
            return new Promise((resolve: (result: boolean) => void, reject: (err: Error) => void) => {

                const configuration = {
                    url: 'ldap://EUROCT1.euromonitor.local',
                    baseDN: 'dc=euromonitor,dc=local',
                    username: `${username}@euromonitor.local`,
                    password,
                };

                const ad = new ActiveDirectory(configuration);

                ad.authenticate(`${username}@euromonitor.local`, password, (err: Error, auth: any) => {
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
        }
    },
    path.join(__dirname, 'views/login.handlebars'),
    null,
    null,
    null,
    null,
));


app.get('/auth/passport/callback', (req: express.Request, res: express.Response) => {

    const client_id = '0zyrWYATtw';
    const client_secret = 'x3h8CTB2Cj';
    const redirect_uri = 'http://localhost:3000/auth/passport/callback';
    const trinityApiUri = 'http://trinity.euromonitor.com';

    co(function* () {
        const response1 = yield request({
            body: {
                client_id: client_id,
                client_secret: client_secret,
                code: req.query.code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            method: 'POST',
            uri: `http://localhost:3000/auth/token`,
            json: true,
            resolveWithFullResponse: true,
        });

        if (response1.statusCode !== 200) {
            res.status(500).json({

            });
            return;
        }

        const response2 = yield request({
            method: 'GET',
            uri: `http://localhost:3000/auth/user`,
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

        const response3 = yield request({
            method: 'POST',
            uri: `${trinityApiUri}/api/auth/token`,
            body: {
                SubscriberId: req.query.state,
                Username: `EURO_NT\\${response2.body.username}`,
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

    }).catch((err: Error) => {
        console.error(err.message, err);
        res.status(500).send(err.message);
    });
});

app.listen(argv.port || 3000, () => {
    console.log(`listening on port ${argv.port || 3000}`);
});