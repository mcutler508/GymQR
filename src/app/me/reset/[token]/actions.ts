'use server';

import { resetPasscodeWithToken } from '@/lib/auth-member';
import { setMemberCookie } from '@/lib/member-cookie';
import { toResult, type ActionResult } from '@/lib/action-result';

export async function resetPasscodeAction(input: {
  token: string;
  passcode: string;
}): Promise<ActionResult<{ id: string; name: string }>> {
  return toResult(async () => {
    const m = await resetPasscodeWithToken(input);
    await setMemberCookie(m.id);
    return { id: m.id, name: m.name };
  });
}
