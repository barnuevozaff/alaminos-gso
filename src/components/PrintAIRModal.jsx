import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark, faPrint } from '@fortawesome/free-solid-svg-icons'
import sealLogo from '../assets/alaminos-seal.png'

export default function PrintAIRModal({ air, po, items, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <button className="modal-close" aria-label="Close" onClick={onClose}><FontAwesomeIcon icon={faXmark} /></button>
        <h3 className="modal-title">Print Preview — {air.air_number}</h3>

        <div className="print-sheet">
          <div className="print-header-center">
            <img src={sealLogo} alt="" style={{ width: 64, height: 64, marginBottom: 6 }} />
            <div className="doc-title" style={{ fontSize: 16 }}>ACCEPTANCE AND INSPECTION REPORT</div>
          </div>

          <div className="print-meta-grid">
            <div><strong>Supplier:</strong> {po?.supplier || '—'}</div>
            <div><strong>AIR No.:</strong> {air.air_number}</div>
            <div><strong>P.O. No.:</strong> {po?.po_number || '—'}</div>
            <div><strong>Date:</strong> {new Date(air.air_date).toLocaleDateString()}</div>
            <div><strong>Requisitioning Office/Dept.:</strong> {air.requisitioning_office || '—'}</div>
            <div><strong>Invoice No.:</strong> {air.invoice_no || '—'}</div>
            <div></div>
            <div><strong>Invoice Date:</strong> {air.invoice_date ? new Date(air.invoice_date).toLocaleDateString() : '—'}</div>
          </div>

          <table>
            <thead><tr><th>Stock/Property No.</th><th>Description</th><th>Unit</th><th>Quantity</th></tr></thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>No items</td></tr>
              ) : items.map((it) => (
                <tr key={it.id}>
                  <td>{it.stock_property_no || ''}</td>
                  <td>{it.description}</td>
                  <td>{it.unit}</td>
                  <td style={{ textAlign: 'right' }}>{it.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 24 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>ACCEPTANCE</div>
              <div>{air.acceptance_type === 'Complete' ? '☑' : '☐'} Complete</div>
              <div>{air.acceptance_type === 'Partial' ? '☑' : '☐'} Partial {air.acceptance_type === 'Partial' && air.partial_notes ? `(${air.partial_notes})` : '(pls. specify)'}</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>INSPECTION</div>
              <div>Inspected, verified and found in order as to quantity and specifications</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 30 }}>
            <div>
              <div className="signature-line">{air.recipient_name}<br /><span className="text-muted">{air.recipient_title}</span></div>
              <div style={{ textAlign: 'center', marginTop: 4, fontSize: 11 }}>Recipient</div>
            </div>
            <div>
              <div className="signature-line">{air.inspector_1_name}<br /><span className="text-muted">{air.inspector_1_title}</span></div>
              <div className="signature-line" style={{ marginTop: 20 }}>{air.inspector_2_name}<br /><span className="text-muted">{air.inspector_2_title}</span></div>
              <div className="signature-line" style={{ marginTop: 20 }}>{air.inspector_3_name}<br /><span className="text-muted">{air.inspector_3_title}</span></div>
            </div>
          </div>
        </div>

        <div className="print-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}><FontAwesomeIcon icon={faPrint} style={{ marginRight: 6 }} />Print</button>
        </div>
      </div>
    </div>
  )
}
