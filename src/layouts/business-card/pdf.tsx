import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { BusinessCardData } from './schema';
import { CARD_PT, makeRows } from '../shared';

const W = 89;
const H = 54;

const styles = StyleSheet.create({
  card: {
    width: CARD_PT(W),
    height: CARD_PT(H),
    backgroundColor: '#ffffff',
    padding: 8,
    border: '0.5pt solid #e5e7eb',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { fontSize: 10, fontWeight: 'bold' },
  title: { fontSize: 6, color: '#64748b', textTransform: 'uppercase', marginTop: 1 },
  logo: { width: 18, height: 18 },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: '#0D9488',
    marginTop: 6,
    paddingTop: 3,
  },
  company: { fontSize: 8, color: '#0D9488', fontWeight: 'bold' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 'auto',
  },
  meta: { fontSize: 5, color: '#334155', marginTop: 1 },
});

function Card({ data }: { data: BusinessCardData }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{data.full_name || 'Full Name'}</Text>
          <Text style={styles.title}>{data.title || 'Job Title'}</Text>
        </View>
        {data.logo ? <Image src={data.logo} style={styles.logo} /> : null}
      </View>
      <View style={styles.divider}>
        <Text style={styles.company}>{data.company || 'Company'}</Text>
      </View>
      <View style={styles.footer}>
        <View>
          {data.email ? <Text style={styles.meta}>{data.email}</Text> : null}
          {data.phone ? <Text style={styles.meta}>{data.phone}</Text> : null}
          {data.website ? <Text style={styles.meta}>{data.website}</Text> : null}
          {data.address ? <Text style={styles.meta}>{data.address}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export interface BusinessCardSheetProps {
  rows: BusinessCardData[];
  perSheet?: number;
}

export function BusinessCardSheet({ rows, perSheet = 10 }: BusinessCardSheetProps) {
  const sheets = makeRows(rows, perSheet);
  return (
    <Document title="PrintReady — Business Cards">
      {sheets.map((s, i) => (
        <Page key={i} size="A4" style={{ padding: 24 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {s.map((row, idx) => (
              <Card key={idx} data={row} />
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
