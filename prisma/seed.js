import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const BLOOD_TYPES = ['A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE']

async function main() {
  console.log('Seeding database...')

  const password = await bcrypt.hash('password123', 10)

  // Users
  const superAdmin = await prisma.user.create({
    data: { email: 'admin@bdms.com', password, role: 'SUPER_ADMIN' }
  })

  const bankAdmin = await prisma.user.create({
    data: { email: 'bankadmin@bdms.com', password, role: 'BLOOD_BANK_ADMIN' }
  })

  const hospitalStaff = await prisma.user.create({
    data: { email: 'hospital@bdms.com', password, role: 'HOSPITAL_STAFF' }
  })

  const labTech = await prisma.user.create({
    data: { email: 'lab@bdms.com', password, role: 'LAB_TECHNICIAN' }
  })

  const coordinator = await prisma.user.create({
    data: { email: 'coordinator@bdms.com', password, role: 'COORDINATOR' }
  })

  const donorUser1 = await prisma.user.create({
    data: { email: 'john@example.com', password, role: 'DONOR' }
  })

  const donorUser2 = await prisma.user.create({
    data: { email: 'jane@example.com', password, role: 'DONOR' }
  })

  const donorUser3 = await prisma.user.create({
    data: { email: 'bob@example.com', password, role: 'DONOR' }
  })

  // Staff profiles
  await prisma.staff.create({
    data: { userId: bankAdmin.id, firstName: 'Sarah', lastName: 'Connor', bloodBankName: 'City Blood Bank' }
  })

  await prisma.staff.create({
    data: { userId: hospitalStaff.id, firstName: 'Mike', lastName: 'Ross', hospitalName: 'General Hospital' }
  })

  await prisma.staff.create({
    data: { userId: labTech.id, firstName: 'Amy', lastName: 'Wong', bloodBankName: 'City Blood Bank Lab' }
  })

  // Donor profiles
  const donor1 = await prisma.donor.create({
    data: {
      userId: donorUser1.id, firstName: 'John', lastName: 'Doe',
      phone: '555-0101', dateOfBirth: new Date('1995-06-15'), gender: 'MALE',
      bloodType: 'O_POSITIVE', address: '123 Main St', city: 'New York', state: 'NY',
      weight: 78, eligibilityStatus: true
    }
  })

  const donor2 = await prisma.donor.create({
    data: {
      userId: donorUser2.id, firstName: 'Jane', lastName: 'Smith',
      phone: '555-0102', dateOfBirth: new Date('1998-03-22'), gender: 'FEMALE',
      bloodType: 'A_POSITIVE', address: '456 Oak Ave', city: 'Los Angeles', state: 'CA',
      weight: 62, eligibilityStatus: true
    }
  })

  const donor3 = await prisma.donor.create({
    data: {
      userId: donorUser3.id, firstName: 'Bob', lastName: 'Wilson',
      phone: '555-0103', dateOfBirth: new Date('1988-11-08'), gender: 'MALE',
      bloodType: 'B_NEGATIVE', address: '789 Pine Rd', city: 'Chicago', state: 'IL',
      weight: 85, eligibilityStatus: true, lastDonationDate: new Date('2025-12-01')
    }
  })

  // Blood units
  const bloodUnits = []
  const unitData = [
    { unitNumber: 'BD-2026-001', bloodType: 'O_POSITIVE', bloodGroup: 'O+', component: 'WHOLE_BLOOD', volume: 450, collectedFromId: donor1.id, status: 'AVAILABLE', storageLocation: 'Fridge A-1' },
    { unitNumber: 'BD-2026-002', bloodType: 'A_POSITIVE', bloodGroup: 'A+', component: 'WHOLE_BLOOD', volume: 450, collectedFromId: donor2.id, status: 'AVAILABLE', storageLocation: 'Fridge A-2' },
    { unitNumber: 'BD-2026-003', bloodType: 'B_NEGATIVE', bloodGroup: 'B-', component: 'RBC', volume: 350, collectedFromId: donor3.id, status: 'AVAILABLE', storageLocation: 'Fridge B-1' },
    { unitNumber: 'BD-2026-004', bloodType: 'O_NEGATIVE', bloodGroup: 'O-', component: 'WHOLE_BLOOD', volume: 450, status: 'AVAILABLE', storageLocation: 'Fridge A-1' },
    { unitNumber: 'BD-2026-005', bloodType: 'AB_POSITIVE', bloodGroup: 'AB+', component: 'PLASMA', volume: 250, status: 'AVAILABLE', storageLocation: 'Fridge C-1' },
    { unitNumber: 'BD-2026-006', bloodType: 'O_POSITIVE', bloodGroup: 'O+', component: 'WHOLE_BLOOD', volume: 450, collectedFromId: donor1.id, status: 'TESTED', storageLocation: 'Fridge A-1' },
    { unitNumber: 'BD-2026-007', bloodType: 'A_POSITIVE', bloodGroup: 'A+', component: 'PLATELETS', volume: 200, collectedFromId: donor2.id, status: 'COLLECTED', storageLocation: 'Fridge D-1' },
    { unitNumber: 'BD-2026-008', bloodType: 'O_POSITIVE', bloodGroup: 'O+', component: 'WHOLE_BLOOD', volume: 450, status: 'RESERVED', storageLocation: 'Fridge A-1' },
    { unitNumber: 'BD-2026-009', bloodType: 'A_NEGATIVE', bloodGroup: 'A-', component: 'RBC', volume: 350, status: 'AVAILABLE', storageLocation: 'Fridge B-2' },
    { unitNumber: 'BD-2026-010', bloodType: 'B_POSITIVE', bloodGroup: 'B+', component: 'WHOLE_BLOOD', volume: 450, status: 'AVAILABLE', storageLocation: 'Fridge A-3' },
    { unitNumber: 'BD-2026-011', bloodType: 'AB_NEGATIVE', bloodGroup: 'AB-', component: 'PLASMA', volume: 250, status: 'AVAILABLE', storageLocation: 'Fridge C-2' },
    { unitNumber: 'BD-2026-012', bloodType: 'O_NEGATIVE', bloodGroup: 'O-', component: 'WHOLE_BLOOD', volume: 450, status: 'EXPIRED', storageLocation: 'Quarantine' },
  ]

  const collectedDate = new Date('2026-05-15')
  const expiryDate = new Date('2026-06-26')

  for (const u of unitData) {
    const unit = await prisma.bloodUnit.create({
      data: {
        ...u,
        collectedDate,
        expiryDate: u.status === 'EXPIRED' ? new Date('2026-05-01') : expiryDate
      }
    })
    bloodUnits.push(unit)
  }

  // Appointment slots
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const slots = [
    { date: tomorrow, startTime: '09:00', endTime: '10:00', capacity: 10, available: 9 },
    { date: tomorrow, startTime: '10:00', endTime: '11:00', capacity: 10, available: 8 },
    { date: tomorrow, startTime: '11:00', endTime: '12:00', capacity: 10, available: 10 },
    { date: tomorrow, startTime: '14:00', endTime: '15:00', capacity: 10, available: 10 },
    { date: tomorrow, startTime: '15:00', endTime: '16:00', capacity: 10, available: 7 },
  ]

  for (const s of slots) {
    await prisma.appointmentSlot.create({
      data: { bloodBankId: 'default', ...s }
    })
  }

  // Appointments
  await prisma.appointment.create({
    data: {
      donorId: donor1.id, bloodBankId: 'default',
      appointmentDate: tomorrow, startTime: '09:00', endTime: '10:00',
      status: 'SCHEDULED', notes: 'First time donor'
    }
  })

  await prisma.appointment.create({
    data: {
      donorId: donor2.id, bloodBankId: 'default',
      appointmentDate: tomorrow, startTime: '10:00', endTime: '11:00',
      status: 'SCHEDULED'
    }
  })

  const pastDate = new Date()
  pastDate.setDate(pastDate.getDate() - 30)

  await prisma.appointment.create({
    data: {
      donorId: donor1.id, bloodBankId: 'default',
      appointmentDate: pastDate, startTime: '09:00', endTime: '10:00',
      status: 'COMPLETED'
    }
  })

  // Donations
  await prisma.donation.create({
    data: {
      donorId: donor1.id, bloodUnitId: bloodUnits[0].id,
      donationDate: pastDate, volume: 450, screeningResult: 'PASSED'
    }
  })

  await prisma.donation.create({
    data: {
      donorId: donor2.id, bloodUnitId: bloodUnits[1].id,
      donationDate: pastDate, volume: 450, screeningResult: 'PASSED'
    }
  })

  // Health screenings
  await prisma.healthScreening.create({
    data: {
      donorId: donor1.id, haemoglobinLevel: 14.5, bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80, heartRate: 72, bodyTemperature: 36.8,
      bloodSugarLevel: 95, weight: 78, notes: 'Healthy donor, all normal'
    }
  })

  await prisma.healthScreening.create({
    data: {
      donorId: donor2.id, haemoglobinLevel: 13.2, bloodPressureSystolic: 110,
      bloodPressureDiastolic: 70, heartRate: 68, bodyTemperature: 36.6,
      bloodSugarLevel: 88, weight: 62, notes: 'Good health'
    }
  })

  // Blood requests
  const request1 = await prisma.bloodRequest.create({
    data: {
      hospitalId: 'HOSP-001', requestedById: hospitalStaff.id,
      bloodType: 'O_POSITIVE', quantity: 2, priority: 'URGENT',
      status: 'PENDING', notes: 'Emergency surgery'
    }
  })

  const request2 = await prisma.bloodRequest.create({
    data: {
      hospitalId: 'HOSP-001', requestedById: hospitalStaff.id,
      bloodType: 'A_POSITIVE', quantity: 3, priority: 'NORMAL',
      status: 'PENDING'
    }
  })

  const request3 = await prisma.bloodRequest.create({
    data: {
      hospitalId: 'HOSP-002', requestedById: hospitalStaff.id,
      bloodType: 'O_NEGATIVE', quantity: 1, priority: 'EMERGENCY',
      status: 'PENDING', notes: 'Trauma patient'
    }
  })

  const request4 = await prisma.bloodRequest.create({
    data: {
      patientName: 'Alice Johnson', patientContact: '555-0199',
      requesterRelation: 'family', requestedById: donorUser1.id,
      bloodType: 'B_NEGATIVE', quantity: 2, priority: 'NORMAL',
      status: 'PENDING', notes: 'Family member needs blood'
    }
  })

  // Reservations for reserved blood unit
  await prisma.reservation.create({
    data: {
      bloodRequestId: request1.id,
      bloodUnitId: bloodUnits[7].id,
      status: 'ACTIVE'
    }
  })

  // Notifications
  await prisma.notification.create({
    data: {
      userId: bankAdmin.id, type: 'REQUEST_STATUS',
      title: 'New Blood Request', message: 'New URGENT request for 2 units of O+'
    }
  })

  await prisma.notification.create({
    data: {
      userId: bankAdmin.id, type: 'REQUEST_STATUS',
      title: 'New Blood Request', message: 'New EMERGENCY request for 1 unit of O-'
    }
  })

  await prisma.notification.create({
    data: {
      userId: hospitalStaff.id, type: 'REQUEST_STATUS',
      title: 'Request Created', message: 'Your blood request has been created successfully'
    }
  })

  console.log('Seeding complete!')
  console.log('\nDemo accounts (password: password123):')
  console.log('  admin@bdms.com       -> SUPER_ADMIN')
  console.log('  bankadmin@bdms.com   -> BLOOD_BANK_ADMIN')
  console.log('  hospital@bdms.com    -> HOSPITAL_STAFF')
  console.log('  lab@bdms.com         -> LAB_TECHNICIAN')
  console.log('  coordinator@bdms.com -> COORDINATOR')
  console.log('  john@example.com     -> DONOR')
  console.log('  jane@example.com     -> DONOR')
  console.log('  bob@example.com      -> DONOR')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
