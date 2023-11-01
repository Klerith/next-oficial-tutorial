'use server';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { signIn } from '@/auth';

const InvoiceSchema = z.object( {
  id: z.string(),
  customerId: z.string( {
    invalid_type_error: 'Please select a customer.',
  } ),
  amount: z.coerce
    .number()
    .gt( 0, { message: 'Amount must be greater than 0.' } ),
  status: z.enum( [ 'pending', 'paid' ], {
    invalid_type_error: 'Please select a status.',
  } ),
  date: z.string(),
});

const CreateInvoice = InvoiceSchema.omit( { id: true, date: true } );
const UpdateInvoice = InvoiceSchema.omit( { date: true } );


export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};


export async function createInvoice(prevState: State, formData: FormData) {

  // const rawFormData = {
  //   customerId: formData.get( 'customerId' ),
  //   amount: formData.get( 'amount' ),
  //   status: formData.get( 'status' ),
  // };
  const rawFormData = Object.fromEntries( formData.entries() );
  const validatedFields = CreateInvoice.safeParse( rawFormData );
  console.log({ validatedFields });
  if ( !validatedFields.success ) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing fields. Failed to create invoice.',
    }
  }

  const { customerId, amount, status } = validatedFields.data;

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split( 'T' )[ 0 ];

  try {
    await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${ customerId }, ${ amountInCents }, ${ status }, ${ date })
    `;

  } catch ( error ) {
    return {
      message: 'Database Error: Failed to create invoice.'
    };
  }

  revalidatePath( '/dashboard/invoices' );
  redirect( '/dashboard/invoices' );
}


export async function updateInvoice( id: string, formData: FormData ) {
  console.log( { id: formData.get( 'id' ) } );
  const { customerId, amount, status } = UpdateInvoice.parse( {
    id: id,
    customerId: formData.get( 'customerId' ),
    amount: formData.get( 'amount' ),
    status: formData.get( 'status' ),
  } );

  const amountInCents = amount * 100;

  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${ customerId }, amount = ${ amountInCents }, status = ${ status }
      WHERE id = ${ id }
    `;

  } catch ( error ) {
    return {
      message: 'Database Error: Failed to update invoice.'
    };
  }

  revalidatePath( '/dashboard/invoices' );
  redirect( '/dashboard/invoices' );
}



export async function deleteInvoice( id: string ) {

  throw new Error( 'Failed to Delete Invoice.' );


  try {
    await sql`DELETE FROM invoices WHERE id = ${ id }`;

  } catch ( error ) {
    return {
      message: 'Database Error: Failed to delete invoice.'
    };
  }
  revalidatePath( '/dashboard/invoices' );
}





export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  
  try {
    await signIn('credentials', Object.fromEntries(formData));
  } catch (error) {
    if ((error as Error).message.includes('CredentialsSignin')) {
      return 'CredentialSignin';
    }
    throw error;
  }

}