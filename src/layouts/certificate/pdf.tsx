import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { CertificateData } from './schema';

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: '#fffbeb',
  },
  inner: {
    flex: 1,
    border: '3pt double #b45309',
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  eyebrow: {
    fontSize: 9,
    color: '#b45309',
    letterSpacing: 4,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  org: { fontSize: 8, color: '#64748b', letterSpacing: 1.5, marginTop: 6 },
  divider: { width: '30%', borderBottomWidth: 0.5, borderBottomColor: '#b45309', marginVertical: 18 },
  intro: { fontSize: 10, color: '#64748b', letterSpacing: 1.5, textTransform: 'uppercase' },
  recipient: {
    fontSize: 32,
    color: '#b45309',
    marginTop: 10,
    fontWeight: 'bold',
  },
  body: { fontSize: 10, color: '#475569', marginTop: 14, textAlign: 'center', maxWidth: '70%' },
  course: { fontSize: 14, color: '#1e293b', marginTop: 10, fontStyle: 'italic', fontWeight: 'bold' },
  bottom: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 'auto',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  col: { width: '30%' },
  label: { fontSize: 7, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 10, fontWeight: 'bold' },
  sigBox: { alignItems: 'center', width: '40%' },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: '#94a3b8', width: '70%', marginTop: 4 },
});

interface CertificateProps {
  data: CertificateData;
}

export function CertificateDocument({ rows }: { rows: CertificateData[] }) {
  const list = rows.length ? rows : [];
  return (
    <Document title="PrintReady — Certificates">
      {list.map((data, idx) => (
        <CertificatePage key={idx} data={data} />
      ))}
    </Document>
  );
}

function CertificatePage({ data }: CertificateProps) {
  return (
    <Page size="A4" orientation="landscape" style={styles.page}>
      <View style={styles.inner}>
        <Text style={styles.eyebrow}>Certificate of Completion</Text>
        <Text style={styles.org}>Awarded by {data.organization || 'Organisation'}</Text>
        <View style={styles.divider} />
        <Text style={styles.intro}>This is to certify that</Text>
        <Text style={styles.recipient}>{data.recipient_name || 'Recipient Name'}</Text>
        <Text style={styles.body}>{data.body}</Text>
        <Text style={styles.course}>“{data.course_title || 'Course / Award Title'}”</Text>

        <View style={styles.bottom}>
          <View style={styles.col}>
            <Text style={styles.label}>Issued</Text>
            <Text style={styles.value}>{data.issued_date || '—'}</Text>
          </View>
          <View style={styles.sigBox}>
            {data.signature_image ? (
              <Image src={data.signature_image} style={{ height: 30, objectFit: 'contain' }} />
            ) : (
              <View style={{ height: 30 }} />
            )}
            <View style={styles.sigLine} />
            <Text style={[styles.label, { marginTop: 4 }]}>
              {data.signatory_name || 'Signatory'}
            </Text>
            {data.signatory_title ? (
              <Text style={{ fontSize: 6, color: '#94a3b8' }}>{data.signatory_title}</Text>
            ) : null}
          </View>
          <View style={[styles.col, { alignItems: 'flex-end' }]}>
            <Text style={styles.label}>Serial</Text>
            <Text style={styles.value}>{data.serial || '—'}</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}
