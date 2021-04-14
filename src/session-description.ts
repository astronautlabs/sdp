export interface Contact {
    value : string;
    name? : string;
}

export type NetworkType = 'IN';
export type AddressType = 'IP4' | 'IP6';

export interface ConnectionDescription {
    networkType : NetworkType;
    addressType : AddressType;
    address : string;
    timeToLive? : number; // 0.0.0.0/<TTL>
    layerCount? : number; // 0.0.0.0/<TTL>/<layerCount>
}

export interface BandwidthDescription {
    value : number; // Kbps
    modifier : string; // CT=Conference Total and AS=Application-Specific Maximum
}

export interface TimeZoneAdjustment {
    time : number;
    adjustment : Interval;
}

export type EncryptionMethod = 'clear' | 'base64' | 'uri' | 'prompt';

export interface EncryptionKey {
    method : EncryptionMethod;
    key? : string;
}

export interface Attribute {
    name : string;
    value : string;
}

export interface SessionDescription {
    version : number;
    origin : Origin;
    sessionName : string;
    information? : string;
    uri? : string;
    emails : Contact[]
    phoneNumbers : Contact[];
    connection? : ConnectionDescription;
    bandwidth : BandwidthDescription[]; // b=
    times : Time[];
    timeZoneAdjustments : TimeZoneAdjustment[]; // z=
    
    /**
     * @deprecated in RFC 4566
     */
    encryptionKey : EncryptionKey;
    attributes : Attribute[];
    media : MediaDescription[];
}

export interface Time {
    startTime : number; // NTP time (UNIX + 2208988800)
    stopTime : number; // NTP time (UNIX + 2208988800)
    repeats? : Repeat[];
}

export type Unit = 'd' | 'h' | 'm' | 's';
export interface Interval {
    value : number;
    unit : Unit;
}

export interface Repeat {
    interval : Interval;
    duration : Interval;
    offsets : Interval[];
}

export interface Origin {
    username : string;
    sessionID : number;
    version : number;
    networkType : NetworkType;
    addressType : AddressType;
    address : string;
}

export interface MediaDescription {
    type : 'audio' | 'video' | 'application' | 'data' | 'control' | string; // m=
    port : number;
    numberOfPorts : number;
    transport : string; // m=
    formats : string[];
    
    title : string; // i=
    connections : ConnectionDescription[]; // c=
    bandwidth : BandwidthDescription[]; // b=
    encryptionKey? : EncryptionKey; // k=
    attributes : Attribute[]; // a=
}

export class SDP {
    static parse(sdp : string): SessionDescription {
        let lines = sdp.split(/\r?\n/g);
        let session : Partial<SessionDescription> = {
            emails: [],
            phoneNumbers: [],
            times: [],
            timeZoneAdjustments: [],
            bandwidth: [],
            attributes: [],
            media: [],
        };
        let media : Partial<MediaDescription> = null;

        for (let line of lines) {
            let equalsIndex = line.indexOf('=');
            let key : string;
            let value : string;

            if (equalsIndex >= 0) {
                key = line.slice(0, equalsIndex);
                value = line.slice(equalsIndex + 1);
            } else {
                key = line;
            }

            if (key === 'm') {
                session.media.push(media = this.parseMedia(value));
                // TODO
                continue;
            }

            if (media) {
                // media level
                switch (key) {
                    case 'i':
                        media.title = value;
                        break;
                    case 'c':
                        media.connections.push(this.parseConnection(value));
                        break;
                    case 'b':
                        media.bandwidth.push(this.parseBandwidth(value));
                        break;
                    case 'k':
                        media.encryptionKey = this.parseEncryptionKey(value);
                        break;
                    case 'a':
                        media.attributes.push(this.parseAttribute(value));
                        break;
                    default:
                        console.warn(`SDP: Warning: Unknown line in media description: ${key}=${value}`);
                }
            } else {
                // session level
                switch (key) {
                    case 'v':
                        session.version = Number(value);
                        break;
                    case 'o':
                        session.origin = this.parseOrigin(value);
                        break;
                    case 's':
                        session.sessionName = value;
                        break;
                    case 'i':
                        session.information = value;
                        break;
                    case 'u':
                        session.uri = value;
                        break;
                    case 'e':
                        session.emails.push(this.parseContact(value));
                        break;
                    case 'p':
                        session.phoneNumbers.push(this.parseContact(value));
                        break;
                    case 'c':
                        session.connection = this.parseConnection(value);
                        break;
                    case 'b':
                        session.bandwidth.push(this.parseBandwidth(value));
                        break;
                    case 't':
                        session.times.push(this.parseTime(value));
                        break;
                    case 'r':
                        let lastTime = session.times[session.times.length - 1];
                        if (!lastTime) {
                            console.warn(`SDP: Warning: Found r= line without a preceding t= line`);
                        } else {
                            lastTime.repeats.push(this.parseRepeat(value));
                        }
                        break;
                    case 'z':
                        session.timeZoneAdjustments.push(...this.parseTimeZoneAdjustment(value));
                        break;
                    case 'k':
                        session.encryptionKey = this.parseEncryptionKey(value);
                        break;
                    case 'a':
                        session.attributes.push(this.parseAttribute(value));
                    default:
                        console.warn(`SDP: Warning: Unknown line in media description: ${key}=${value}`);
                }
            }
        }

        return <SessionDescription>session;
    }

    private static parseTimeZoneAdjustment(str : string): TimeZoneAdjustment[] {
        let parts = str.split(' ');
        let adjustments : TimeZoneAdjustment[] = [];

        for (let i = 0, max = parts.length; i < max; i += 2) {
            adjustments.push({ time: Number(parts[i]), adjustment: this.parseInterval(parts[i + 1]) });
        }

        return adjustments;
    }

    private static parseMedia(str : string): MediaDescription {
        let [ type, port, transport, ...formats ] = str.split(' ');
        let numberOfPorts = 1;
        if (port.includes('/')) {
            let parts = port.split('/');
            port = port[0];
            numberOfPorts = Number(port[1]);
        }
        return { 
            type, 
            port: Number(port), 
            numberOfPorts, 
            transport, 
            formats,
            attributes: [],
            bandwidth: [],
            connections: [],
            title: null
        };
    }

    private static parseAttribute(str : string): Attribute {
        let colonIndex = str.indexOf(':');
        let name = str;
        let value : string;

        if (colonIndex >= 0) {
            name = str.slice(0, colonIndex);
            value = str.slice(colonIndex + 1);
        }

        return { name, value };
    }

    private static parseEncryptionKey(str : string): EncryptionKey {
        let colonIndex = str.indexOf(':');
        let method : string, key : string;

        if (colonIndex >= 0) {
            method = str.slice(0, colonIndex);
            key = str.slice(colonIndex + 1);
        } else {
            method = str;
        }

        return { method: <EncryptionMethod>method, key };
    }

    private static parseTime(str : string): Time {
        let [ startTime, stopTime ] = str.split(' ');
        return { startTime: Number(startTime), stopTime: Number(stopTime), repeats: [] };
    }

    private static parseRepeat(str : string): Repeat {
        let [ interval, duration, ...offsets ] = str.split(' ').map(x => this.parseInterval(x));
        return { interval, duration, offsets };
    }

    private static parseInterval(str : string): Interval {
        let [ value, unit ] = str.match(/(.*)([dhms])/);
        return { value: Number(value), unit: <Unit>unit };
    }

    private static parseBandwidth(str : string): BandwidthDescription {
        let [ modifier, value ] = str.split(':');
        return { modifier, value: Number(value) };
    }

    private static parseConnection(value : string): ConnectionDescription {
        let [ networkType, addressType, address ] = value.split(' ');
        let layerCount : number = 1;
        let timeToLive : number;

        if (networkType === 'IN' && addressType === 'IP4') {
            let parts = address.split('/');
            address = parts[0];
            timeToLive = Number(parts[1]);
            layerCount = Number(parts[2]) || 1;
        } else if (networkType === 'IN' && addressType === 'IP6') {
            let parts = address.split('/');
            address = parts[0];
            layerCount = Number(parts[1]) || 1;
        }

        return { 
            addressType: <AddressType>addressType, 
            address, 
            networkType: <NetworkType>networkType,
            layerCount,
            timeToLive
        };
    }

    private static parseContact(value : string): Contact {
        let format1 = /^(.*) +\((.*)\)$/;
        let format2 = /^(.*) +<(.*)>$/;
        let match;
        if (match = value.match(format1)) {
            return { value: match[1], name: match[2] };
        } else if (match = value.match(format2)) {
            return { value: match[2], name: match[1] };
        } else {
            return { value };
        }
    }

    private static parseOrigin(value : string): Origin {
        // o=<username> <session id> <version> <network type> <address type> <address>
        let [ username, sessionID, version, networkType, addressType, address ] = value.split(' ');
        return { username, sessionID: Number(sessionID), version: Number(version), networkType: <NetworkType>networkType, 
            addressType: <AddressType>addressType, address };
    }

    static stringify(sdp : SessionDescription): string {
        let lines : string[] = [];

        lines.push(
            `v=${sdp.version}`,
            `o=${sdp.origin.username} ${sdp.origin.sessionID} ${sdp.origin.version} ${sdp.origin.networkType} ${sdp.origin.addressType} ${sdp.origin.address}`,
            `s=${sdp.sessionName}`
        );

        if (sdp.information)
            lines.push(`i=${sdp.information}`);
        if (sdp.uri)
            lines.push(`u=${sdp.uri}`);

        if (sdp.emails)
            lines.push(...sdp.emails.map(e => `e=${e.name ? `${e.value} (${e.name})` : e.value}`));
        
        if (sdp.phoneNumbers)
            lines.push(...sdp.phoneNumbers.map(p => `p=${p.name ? `${p.value} (${p.name})` : p.value}`));
        
        if (sdp.connection) {
            let address = sdp.connection.address;
            if (sdp.connection.networkType === 'IN' && sdp.connection.addressType === 'IP4') {
                if (sdp.connection.timeToLive !== void 0) {
                    address = `${address}/${sdp.connection.timeToLive}`;
                    if (sdp.connection.layerCount > 1)
                        address = `${address}/${sdp.connection.layerCount}`;
                }
            } else if (sdp.connection.networkType === 'IN' && sdp.connection.addressType === 'IP6') {
                if (sdp.connection.layerCount > 1)
                    address = `${address}/${sdp.connection.layerCount}`;
            }

            lines.push(`c=${sdp.connection.networkType} ${sdp.connection.addressType} ${address}`)
        }

        if (sdp.bandwidth)
            lines.push(...sdp.bandwidth.map(b => `b=${b.modifier}:${b.value}`));

        if (sdp.times) {
            for (let time of sdp.times) {
                lines.push(`t=${time.startTime} ${time.stopTime}`);
                for (let repeat of time.repeats) {
                    lines.push(`r=${repeat.interval} ${repeat.duration} ${repeat.offsets.join(' ')}`);
                }
            }
        }

        if (sdp.encryptionKey) {
            if (sdp.encryptionKey.key)
                lines.push(`k=${sdp.encryptionKey.method}:${sdp.encryptionKey.key}`);
            else
                lines.push(`k=${sdp.encryptionKey.method}`);
        }

        for (let attr of sdp.attributes) {
            if (attr.value === void 0)
                lines.push(`a=${attr.name}`);
            else
                lines.push(`a=${attr.name}:${attr.value}`);
        }

        for (let media of sdp.media) {
            let port = String(media.port);
            if (media.numberOfPorts > 1) {
                port = `${port}/${media.numberOfPorts}`;
            }
            lines.push(`m=${media.type} ${port} ${media.transport} ${media.formats.join(' ')}`);

            if (media.title)
                lines.push(`i=${media.title}`);
            
            if (media.connections) {
                for (let connection of media.connections) {
                    let address = connection.address;
                    if (connection.timeToLive !== void 0) {
                        address = `${address}/${connection.timeToLive}`;
                        if (connection.layerCount)
                            address = `${address}/${connection.layerCount}`;
                    }
                    lines.push(`c=${connection.networkType} ${connection.addressType} ${address}`);
                }
            }

            if (media.bandwidth)
                lines.push(...sdp.bandwidth.map(b => `b=${b.modifier}:${b.value}`));
            
            if (media.encryptionKey) {
                if (media.encryptionKey.key)
                    lines.push(`k=${media.encryptionKey.method}:${media.encryptionKey.key}`);
                else
                    lines.push(`k=${media.encryptionKey.method}`);
            }

            for (let attr of media.attributes) {
                if (attr.value === void 0)
                    lines.push(`a=${attr.name}`);
                else
                    lines.push(`a=${attr.name}:${attr.value}`);
            }
        }

        return lines.join("\r\n");
    }
}