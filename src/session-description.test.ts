import { expect } from "chai";
import { describe } from "razmin";
import { SDP, SessionDescription } from "./session-description";

const EXAMPLE1 = `v=0
o=jdoe 2890844526 2890842807 IN IP4 10.47.16.5
s=SDP Seminar
i=A Seminar on the session description protocol
u=http://www.example.com/seminars/sdp.pdf
e=j.doe@example.com (Jane Doe)
c=IN IP4 224.2.17.12/127
t=2873397496 2873404696
a=recvonly
m=audio 49170 RTP/AVP 0
m=video 51372 RTP/AVP 99
a=rtpmap:99 h263-1998/90000`.replace(/\n/g, "\r\n");

describe('SDP', it => {
    it('parses a simple sdp', () => {
        let sdp = SDP.parse(EXAMPLE1);

        expect(sdp.version).to.equal(0);
        expect(sdp.origin.username).to.equal('jdoe');
        expect(sdp.origin.sessionID).to.equal(2890844526);
        expect(sdp.origin.version).to.equal(2890842807);
        expect(sdp.origin.networkType).to.equal('IN');
        expect(sdp.origin.addressType).to.equal('IP4');
        expect(sdp.origin.address).to.equal('10.47.16.5');
        expect(sdp.sessionName).to.equal('SDP Seminar');
        expect(sdp.information).to.equal('A Seminar on the session description protocol');
        expect(sdp.uri).to.equal('http://www.example.com/seminars/sdp.pdf');
        
        expect(sdp.emails.length).to.equal(1);
        expect(sdp.emails[0].value).to.equal('j.doe@example.com');
        expect(sdp.emails[0].name).to.equal('Jane Doe');
        expect(sdp.connection.networkType).to.equal('IN');
        expect(sdp.connection.addressType).to.equal('IP4');
        expect(sdp.connection.address).to.equal('224.2.17.12');
        expect(sdp.connection.timeToLive).to.equal(127);
        expect(sdp.connection.layerCount).to.equal(1);
        expect(sdp.times.length).to.equal(1);
        expect(sdp.times[0].startTime).to.equal(2873397496);
        expect(sdp.times[0].stopTime).to.equal(2873404696);
        expect(sdp.attributes.length).to.equal(1);
        expect(sdp.attributes[0].name).to.equal('recvonly');
        expect(sdp.attributes[0].value).to.equal(undefined);

        expect(sdp.media.length).to.equal(2);

        expect(sdp.media[0].type).to.equal('audio');
        expect(sdp.media[0].port).to.equal(49170);
        expect(sdp.media[0].transport).to.equal('RTP/AVP');
        expect(sdp.media[0].formats).to.eql(['0']);

        expect(sdp.media[1].type).to.equal('video');
        expect(sdp.media[1].port).to.equal(51372);
        expect(sdp.media[1].transport).to.equal('RTP/AVP');
        expect(sdp.media[1].formats).to.eql(['99']);
        expect(sdp.media[1].attributes[0].value).to.equal('99 h263-1998/90000');
        expect(sdp.media[1].attributes[0].value).to.equal('99 h263-1998/90000');

        console.log(JSON.stringify(sdp));
    });

    it('should be tolerant of line endings', () => {
        let sdp = SDP.parse(EXAMPLE1.replace(/\r\n/g, "\n"));
        expect(sdp.uri).to.equal('http://www.example.com/seminars/sdp.pdf');
    });

    it('stringifies a basic example', () => {
        let json : SessionDescription = JSON.parse(
            `{"emails":[{"value":"j.doe@example.com","name":"Jane Doe"}],"phoneNumbers":[],"times":[{"startTime":2873397496,"stopTime":2873404696,"repeats":[]}],"timeZoneAdjustments":[],"bandwidth":[],"attributes":[{"name":"recvonly"}],"media":[{"type":"audio","port":49170,"numberOfPorts":1,"transport":"RTP/AVP","formats":["0"],"attributes":[],"bandwidth":[],"connections":[],"title":null},{"type":"video","port":51372,"numberOfPorts":1,"transport":"RTP/AVP","formats":["99"],"attributes":[{"name":"rtpmap","value":"99 h263-1998/90000"}],"bandwidth":[],"connections":[],"title":null}],"version":0,"origin":{"username":"jdoe","sessionID":2890844526,"version":2890842807,"networkType":"IN","addressType":"IP4","address":"10.47.16.5"},"sessionName":"SDP Seminar","information":"A Seminar on the session description protocol","uri":"http://www.example.com/seminars/sdp.pdf","connection":{"addressType":"IP4","address":"224.2.17.12","networkType":"IN","layerCount":1,"timeToLive":127}}`
        );
        let sdp = SDP.stringify(json);
        expect(sdp).to.equal(EXAMPLE1);
    });
});