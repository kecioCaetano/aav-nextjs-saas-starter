import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  pgEnum,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const companies = pgTable('tb_companies', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
});

export const addresses = pgTable('tb_addresses', {
  id: serial('id').primaryKey(),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  countryCode: text('country_code').notNull(),
  addressType: text('address_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
});

export const pessoaType = pgEnum('pessoa_type', ['llc', 'person']);

export const pessoas = pgTable('tb_people', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  zipcode: text('zipcode').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  note: text('note'),
  type: pessoaType('type').notNull().default('person'),
  companyId: integer('company_id').references(() => companies.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('tb_pessoa_email_idx').on(table.email),
]);

export const peopleAddresses = pgTable('tb_people_addresses', {
  peopleId: integer('people_id')
    .notNull()
    .references(() => pessoas.id),
  addressesId: integer('addresses_id')
    .notNull()
    .references(() => addresses.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const menus = pgTable('tb_menus', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  url: text('url'),
  menuId: integer('menu_id').references((): AnyPgColumn => menus.id),
});

export const makes = pgTable('tb_makes', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
});

export const models = pgTable('tb_models', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
});

export const trims = pgTable('tb_trims', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
});

export const conditions = pgTable('tb_conditions', {
  id: serial('id').primaryKey(),
  description: text('description').notNull(),
});

export const vehicleOwnership = pgEnum('vehicle_ownership', ['paid-off', 'loan', 'lease']);
export const vehicleTitle = pgEnum('vehicle_title', ['clean', 'salvage', 'non-repairable', 'no title']);

export const vehicles = pgTable('tb_vehicles', {
  id: serial('id').primaryKey(),
  vim: text('vim').notNull(),
  year: integer('year').notNull(),
  make: integer('make').notNull().references(() => makes.id),
  model: integer('model').notNull().references(() => models.id),
  trims: integer('trims').references(() => trims.id),
  mileage: integer('mileage'),
  fuelTypePrimary: text('fuel_type_primary'),
  type: text('type'),
  note: text('note'),
  ownership: vehicleOwnership('ownership'),
  title: vehicleTitle('title'),
  plate: text('plate'),
  companyId: integer('company_id').notNull().references(() => companies.id),
  latitude: numeric('latitude', { precision: 9, scale: 6 }),
  longitude: numeric('longitude', { precision: 9, scale: 6 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('tb_vehicles_vim_idx').on(table.vim),
]);

export const vehicleConditions = pgTable('tb_vehicle_conditions', {
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  conditionsId: integer('conditions_id')
    .notNull()
    .references(() => conditions.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const quoteOrigemType = pgEnum('quote_origem_type', ['online', 'app', 'phone']);
export const quoteStatus = pgEnum('quote_status', ['pending', 'processing', 'analysed']);

export const quotes = pgTable('tb_quotes', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity({ startWith: 10000 }),
  year: integer('year').notNull(),
  makeId: integer('make_id').notNull().references(() => makes.id),
  modelsId: integer('models_id').notNull().references(() => models.id),
  trimsId: integer('trims_id').references(() => trims.id),
  fullName: text('full_name').notNull(),
  zipCode: text('zip_code').notNull(),
  phone: text('phone').notNull(),
  description: text('description'),
  origemType: quoteOrigemType('origem_type'),
  status: quoteStatus('status'),
  value: numeric('value'),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const orders = pgTable('tb_orders', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity({ startWith: 20000 }),
  peopleId: integer('people_id').notNull().references(() => pessoas.id),
  quotesId: integer('quotes_id').references(() => quotes.id),
  cost: numeric('cost').notNull(),
  dtTowing: timestamp('dt_towing'),
  dtOpen: timestamp('dt_open').notNull().defaultNow(),
  dtProcessing: timestamp('dt_processing'),
  dtClosed: timestamp('dt_closed'),
});

export const ordersVehicles = pgTable('tb_orders_vehicles', {
  id: serial('id').primaryKey(),
  vehiclesId: integer('vehicles_id').notNull().references(() => vehicles.id),
  ordersId: integer('orders_id').notNull().references(() => orders.id),
  addressesId: integer('addresses_id').references(() => addresses.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const quotesPhotos = pgTable('tb_quotes_photos', {
  id: serial('id').primaryKey(),
  quotesId: integer('quotes_id').references(() => quotes.id),
  vehicleId: integer('vehicle_id').references(() => vehicles.id),
  urlPhoto: text('url_photo').notNull(),
  type: text('type').notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const companiesUsers = pgTable('tb_companies_users', {
  id: serial('id').primaryKey(),
  companiesId: integer('companies_id')
    .notNull()
    .references(() => companies.id),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const companiesUsersMenus = pgTable('tb_companies_users_menus', {
  companyUsersId: integer('company_users_id')
    .notNull()
    .references(() => companiesUsers.id),
  menuId: integer('menu_id')
    .notNull()
    .references(() => menus.id),
  readOnly: boolean('read-only').notNull().default(false),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;
export type Pessoa = typeof pessoas.$inferSelect;
export type NewPessoa = typeof pessoas.$inferInsert;
export type PeopleAddress = typeof peopleAddresses.$inferSelect;
export type NewPeopleAddress = typeof peopleAddresses.$inferInsert;
export type CompanyUser = typeof companiesUsers.$inferSelect;
export type NewCompanyUser = typeof companiesUsers.$inferInsert;
export type CompanyUserMenu = typeof companiesUsersMenus.$inferSelect;
export type NewCompanyUserMenu = typeof companiesUsersMenus.$inferInsert;
export type Menu = typeof menus.$inferSelect;
export type NewMenu = typeof menus.$inferInsert;
export type Make = typeof makes.$inferSelect;
export type NewMake = typeof makes.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type Trim = typeof trims.$inferSelect;
export type NewTrim = typeof trims.$inferInsert;
export type Condition = typeof conditions.$inferSelect;
export type NewCondition = typeof conditions.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type VehicleCondition = typeof vehicleConditions.$inferSelect;
export type NewVehicleCondition = typeof vehicleConditions.$inferInsert;
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderVehicle = typeof ordersVehicles.$inferSelect;
export type NewOrderVehicle = typeof ordersVehicles.$inferInsert;
export type QuotePhoto = typeof quotesPhotos.$inferSelect;
export type NewQuotePhoto = typeof quotesPhotos.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
