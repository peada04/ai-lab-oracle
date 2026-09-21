import { LabSpecs, JournalEntry } from './types';

// Seed data shown on first run. Replace these with your own hardware from the
// Specs panel in the UI — they are only defaults, not configuration.
export const LAB_SPECS: LabSpecs = [
  { id: 'compute', label: 'Compute', value: 'Single GPU workstation (24GB VRAM)', icon: 'Server' },
  { id: 'ram', label: 'RAM', value: '64GB DDR5', icon: 'Memory' },
  { id: 'arch', label: 'Arch', value: 'x86_64 (16-core)', icon: 'Terminal' },
  { id: 'storage', label: 'Storage', value: 'NAS over NFS', icon: 'HardDrive' },
  { id: 'aux', label: 'Aux', value: 'Hypervisor cluster (Linux)', icon: 'Database' },
  { id: 'network', label: 'Network', value: '10GbE Internal', icon: 'Network' }
];

// Example past experiments. The feasibility prompt uses these as context, so
// replacing them with your own history improves the quality of its answers.
export const LAB_JOURNAL: JournalEntry[] = [
  {
    project: "Vector Search Prototype",
    status: "Success",
    learnings: "Vector DB ran comfortably alongside a 7B model on one GPU; embedding throughput was the limit, not VRAM."
  },
  {
    project: "Time Series Forecasting",
    status: "In-Progress",
    learnings: "Data ingestion from network storage is bottlenecked by SMB; switching to NFS."
  }
];
