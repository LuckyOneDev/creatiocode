export class ConnectionInfo {
	url: string;
	login: string;
	password: string;

	private hostURL: URL;

	constructor(url: string, login: string, password: string) {
		this.url = url;
		this.login = login;
		this.password = password;
		this.hostURL = new URL(this.url);
	}

	public getHostName(): string {
		return this.hostURL.hostname;
	}

	public getPort(): string {
		return this.hostURL.port;
	}
}