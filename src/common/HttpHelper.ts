import { ConnectionInfo } from "../creatio-api/ConnectionInfo";
import * as http from 'http';
import * as https from 'https';

/* eslint-disable @typescript-eslint/naming-convention */
export class HttpHelper {
    private static UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36";

    public static Post(conInfo: ConnectionInfo, path: string, postData: any, additionalHeaders: http.OutgoingHttpHeaders = {}): Promise<any> {
        return new Promise((resolve, reject) => {
            if (postData) { postData = JSON.stringify(postData); }

            const options: http.RequestOptions = {
                host: conInfo.getHostName(),
                path: path,
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json',
                    'Content-Length': postData ? Buffer.byteLength(postData) : 0,
                    'User-Agent': this.UserAgent,
                },
            };

            options.headers = { ...options.headers, ...additionalHeaders };

            if (conInfo.getPort() !== '') {
                options.port = conInfo.getPort();
            }

            const req = https.request(options, (response) => {
                var str = '';
                response.on('data', function (chunk) {
                    str += chunk;
                });

                response.on('end', function () {
                    resolve({
                        response: response,
                        body: str
                    });
                });
            });

            req.on('error', reject);

            if (postData) { 
                req.write(postData); 
            }
            req.end();
        });
    }

    public static isJSON(text: string): boolean {
        try {
            JSON.parse(text);
        } catch (e) {
            return false;
        }
        return true;
    }
}