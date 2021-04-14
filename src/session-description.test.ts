import { expect } from "chai";
import { describe } from "razmin";
import { SDP } from "./session-description";

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
a=rtpmap:99 h263-1998/90000`;

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
    });
});