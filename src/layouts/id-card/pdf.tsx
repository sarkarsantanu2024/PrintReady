import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { IdCardData } from './schema';
import { CARD_PT, makeRows } from '../shared';

const W = 85.6; // mm
const H = 54;

const styles = StyleSheet.create({
  card: {
    width: CARD_PT(W),
    height: CARD_PT(H),
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    overflow: 'hidden',
    border: '0.5pt solid #e5e7eb',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: CARD_PT(H * 0.25),
    backgroundColor: '#0D9488',
  },
  photoCell: { width: '35%', padding: 4, paddingTop: CARD_PT(H * 0.25) + 2 },
  photoBox: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  details: { flex: 1, padding: 4 },
  org: { color: '#fff', fontSize: 5, fontWeight: 'bold', letterSpacing: 0.5 },
  name: { fontSize: 8, fontWeight: 'bold', marginTop: 8 },
  role: { fontSize: 5, color: '#64748b', textTransform: 'uppercase', marginTop: 1 },
  meta: { fontSize: 5, color: '#334155', marginTop: 1 },
});

function CardFace({ data }: { data: IdCardData }) {
  return (
    <View style={styles.card}>
      <View style={styles.band} />
      <View style={styles.photoCell}>
        <View style={styles.photoBox}>
          {data.photo ? <Image src={data.photo} style={{ width: '100%', height: '100%' }} /> : null}
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.org}>{(data.org_name || 'ORGANISATION').toUpperCase()}</Text>
        <Text style={styles.name}>{data.full_name || 'Full Name'}</Text>
        <Text style={styles.role}>{data.designation || 'Designation'}</Text>
        <Text style={styles.meta}>ID: {data.id_number || '—'}</Text>
        {data.department ? <Text style={styles.meta}>Dept: {data.department}</Text> : null}
        {data.blood_group ? <Text style={styles.meta}>Blood: {data.blood_group}</Text> : null}
        {data.valid_until ? <Text style={styles.meta}>Valid: {data.valid_until}</Text> : null}
      </View>
    </View>
  );
}

export interface IdCardSheetProps {
  rows: IdCardData[];
  /** Cards per A4 sheet — defaults to 8 (2×4). */
  perSheet?: number;
}

export function IdCardSheet({ rows, perSheet = 8 }: IdCardSheetProps) {
  const sheets = makeRows(rows, perSheet);
  return (
    <Document title="PrintReady — ID Cards">
      {sheets.map((sheetRows, i) => (
        <Page key={i} size="A4" style={{ padding: 24 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {sheetRows.map((row, idx) => (
              <CardFace key={idx} data={row} />
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
