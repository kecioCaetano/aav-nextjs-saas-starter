'use server';

import { z } from 'zod';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import {
  User,
  users,
  teams,
  teamMembers,
  activityLogs,
  type NewActivityLog,
  ActivityType,
  invitations
} from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createCheckoutSession } from '@/lib/payments/stripe';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { getTranslations } from 'next-intl/server';
import {
  validatedAction,
  validatedActionWithUser
} from '@/lib/auth/middleware';

async function logActivity(
  teamId: number | null | undefined,
  userId: number,
  type: ActivityType,
  ipAddress?: string,
  database: Pick<typeof db, 'insert'> = db
) {
  if (teamId === null || teamId === undefined) {
    return;
  }
  const newActivity: NewActivityLog = {
    teamId,
    userId,
    action: type,
    ipAddress: ipAddress || ''
  };
  await database.insert(activityLogs).values(newActivity);
}

const signInSchema = z.object({
  email: z.string().email().min(3).max(255),
  password: z.string().min(8).max(100)
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;
  const t = await getTranslations('ActionMessages');

  const userWithTeam = await db
    .select({
      user: users,
      team: teams
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, email))
    .limit(1);

  if (userWithTeam.length === 0) {
    return {
      error: t('invalidCredentials'),
      email,
      password
    };
  }

  const { user: foundUser, team: foundTeam } = userWithTeam[0];

  const isPasswordValid = await comparePasswords(
    password,
    foundUser.passwordHash
  );

  if (!isPasswordValid) {
    return {
      error: t('invalidCredentials'),
      email,
      password
    };
  }

  await Promise.all([
    setSession(foundUser),
    logActivity(foundTeam?.id, foundUser.id, ActivityType.SIGN_IN)
  ]);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: foundTeam, priceId });
  }

  redirect('/dashboard');
});

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  inviteId: z.string().optional()
});


class SignupUserAlreadyExists extends Error {}

export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;
  const t = await getTranslations('ActionMessages');

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    return { error: t('createUserFailed'), email, password };
  }

  const invitationId = inviteId ? Number(inviteId) : null;
  if (
    inviteId &&
    (!/^[1-9]\d*$/.test(inviteId) ||
      !Number.isSafeInteger(invitationId) ||
      Number(invitationId) > 2147483647)
  ) {
    return { error: t('invalidInvitation'), email, password };
  }

  const passwordHash = await hashPassword(password);
  let result;
  try {
    result = await db.transaction(async (tx) => {
      let invitation: typeof invitations.$inferSelect | undefined;
      if (invitationId !== null) {
        [invitation] = await tx
          .update(invitations)
          .set({ status: 'accepted' })
          .where(
            and(
              eq(invitations.id, invitationId),
              eq(invitations.email, email),
              eq(invitations.status, 'pending')
            )
          )
          .returning();

        if (!invitation) return { invalidInvitation: true as const };
      }

      const [createdUser] = await tx
        .insert(users)
        .values({
          email,
          passwordHash,
          role: invitation?.role ?? 'owner'
        })
        .onConflictDoNothing({ target: users.email })
        .returning();

      if (!createdUser) throw new SignupUserAlreadyExists();

      let createdTeam: typeof teams.$inferSelect;
      if (invitation) {
        const [team] = await tx
          .select()
          .from(teams)
          .where(eq(teams.id, invitation.teamId))
          .limit(1);
        if (!team) throw new Error('Invited team not found');
        createdTeam = team;
        await logActivity(team.id, createdUser.id, ActivityType.ACCEPT_INVITATION, undefined, tx);
      } else {
        const [team] = await tx
          .insert(teams)
          .values({ name: `${email}'s Team` })
          .returning();
        if (!team) throw new Error('Failed to create team');
        createdTeam = team;
        await logActivity(team.id, createdUser.id, ActivityType.CREATE_TEAM, undefined, tx);
      }

      await tx.insert(teamMembers).values({
        userId: createdUser.id,
        teamId: createdTeam.id,
        role: invitation?.role ?? 'owner'
      });
      await logActivity(createdTeam.id, createdUser.id, ActivityType.SIGN_UP, undefined, tx);
      return { createdUser, createdTeam };
    });
  } catch (error) {
    if (error instanceof SignupUserAlreadyExists) {
      return { error: t('createUserFailed'), email, password };
    }
    throw error;
  }

  if ('invalidInvitation' in result) {
    return { error: t('invalidInvitation'), email, password };
  }

  await setSession(result.createdUser);

  const redirectTo = formData.get('redirect') as string | null;
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({ team: result.createdTeam, priceId });
  }

  redirect('/dashboard');
});

export async function signOut() {
  const user = (await getUser()) as User;
  const userWithTeam = await getUserWithTeam(user.id);
  await logActivity(userWithTeam?.teamId, user.id, ActivityType.SIGN_OUT);
  (await cookies()).delete('session');
}

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(100),
  newPassword: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100)
});

export const updatePassword = validatedActionWithUser(
  updatePasswordSchema,
  async (data, _, user) => {
    const { currentPassword, newPassword, confirmPassword } = data;
    const t = await getTranslations('ActionMessages');

    const isPasswordValid = await comparePasswords(
      currentPassword,
      user.passwordHash
    );

    if (!isPasswordValid) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: t('incorrectCurrentPassword')
      };
    }

    if (currentPassword === newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: t('passwordUnchanged')
      };
    }

    if (confirmPassword !== newPassword) {
      return {
        currentPassword,
        newPassword,
        confirmPassword,
        error: t('passwordMismatch')
      };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const userWithTeam = await getUserWithTeam(user.id);

    await Promise.all([
      db
        .update(users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(users.id, user.id)),
      logActivity(userWithTeam?.teamId, user.id, ActivityType.UPDATE_PASSWORD)
    ]);

    return {
      success: t('passwordUpdated')
    };
  }
);

const deleteAccountSchema = z.object({
  password: z.string().min(8).max(100)
});

export const deleteAccount = validatedActionWithUser(
  deleteAccountSchema,
  async (data, _, user) => {
    const { password } = data;
    const t = await getTranslations('ActionMessages');

    const isPasswordValid = await comparePasswords(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        password,
        error: t('deleteIncorrectPassword')
      };
    }

    const userWithTeam = await getUserWithTeam(user.id);

    await db.transaction(async (tx) => {
      await logActivity(
        userWithTeam?.teamId,
        user.id,
        ActivityType.DELETE_ACCOUNT,
        undefined,
        tx
      );

      await tx
        .update(users)
        .set({
          deletedAt: sql`CURRENT_TIMESTAMP`,
          email: sql`CONCAT(email, '-', id, '-deleted')` // Ensure email uniqueness
        })
        .where(eq(users.id, user.id));

      if (userWithTeam?.teamId) {
        await tx
          .delete(teamMembers)
          .where(
            and(
              eq(teamMembers.userId, user.id),
              eq(teamMembers.teamId, userWithTeam.teamId)
            )
          );
      }
    });

    (await cookies()).delete('session');
    redirect('/sign-in');
  }
);

const updateAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address')
});

export const updateAccount = validatedActionWithUser(
  updateAccountSchema,
  async (data, _, user) => {
    const { name, email } = data;
    const t = await getTranslations('ActionMessages');
    const userWithTeam = await getUserWithTeam(user.id);

    await db.transaction(async (tx) => {
      await tx.update(users).set({ name, email }).where(eq(users.id, user.id));
      await logActivity(
        userWithTeam?.teamId,
        user.id,
        ActivityType.UPDATE_ACCOUNT,
        undefined,
        tx
      );
    });

    return { name, success: t('accountUpdated') };
  }
);

const removeTeamMemberSchema = z.object({
  memberId: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .refine((id) => Number.isSafeInteger(id) && id <= 2147483647)
});

export const removeTeamMember = validatedActionWithUser(
  removeTeamMemberSchema,
  async (data, _, user) => {
    const { memberId } = data;
    const t = await getTranslations('ActionMessages');
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: t('noTeam') };
    }

    const teamId = userWithTeam.teamId;
    const outcome = await db.transaction(async (tx) => {
      const [membership] = await tx
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)))
        .limit(1)
        .for('update');

      if (!membership || membership.role !== 'owner') return 'ownerRequired' as const;
      if (membership.id === memberId) return 'cannotRemoveSelf' as const;

      const [removed] = await tx
        .delete(teamMembers)
        .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, teamId)))
        .returning({ id: teamMembers.id });

      if (!removed) return 'memberNotFound' as const;

      await logActivity(teamId, user.id, ActivityType.REMOVE_TEAM_MEMBER, undefined, tx);
      return 'memberRemoved' as const;
    });

    return outcome === 'memberRemoved'
      ? { success: t(outcome) }
      : { error: t(outcome) };
  }
);

const inviteTeamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['member', 'owner'])
});

export const inviteTeamMember = validatedActionWithUser(
  inviteTeamMemberSchema,
  async (data, _, user) => {
    const { email, role } = data;
    const t = await getTranslations('ActionMessages');
    const userWithTeam = await getUserWithTeam(user.id);

    if (!userWithTeam?.teamId) {
      return { error: t('noTeam') };
    }

    const teamId = userWithTeam.teamId;
    const outcome = await db.transaction(async (tx) => {
      const [membership] = await tx
        .select()
        .from(teamMembers)
        .where(and(eq(teamMembers.userId, user.id), eq(teamMembers.teamId, teamId)))
        .limit(1)
        .for('update');

      if (!membership || membership.role !== 'owner') return 'inviteOwnerRequired' as const;

      // Serialize invitation checks for the team, including requests by different owners.
      const [team] = await tx.select().from(teams).where(eq(teams.id, teamId)).limit(1).for('update');
      if (!team) throw new Error('Team not found');

      const existingMember = await tx
        .select()
        .from(users)
        .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
        .where(and(eq(users.email, email), eq(teamMembers.teamId, teamId)))
        .limit(1);

      if (existingMember.length > 0) return 'alreadyMember' as const;

      const existingInvitation = await tx
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.email, email),
            eq(invitations.teamId, teamId),
            eq(invitations.status, 'pending')
          )
        )
        .limit(1);

      if (existingInvitation.length > 0) return 'invitationExists' as const;

      await tx.insert(invitations).values({
        teamId,
        email,
        role,
        invitedBy: user.id,
        status: 'pending'
      });

      await logActivity(teamId, user.id, ActivityType.INVITE_TEAM_MEMBER, undefined, tx);
      return 'invitationSent' as const;
    });

    // TODO: Send invitation email and include ?inviteId={id} to sign-up URL
    // await sendInvitationEmail(email, userWithTeam.team.name, role)

    return outcome === 'invitationSent'
      ? { success: t(outcome) }
      : { error: t(outcome) };
  }
);
