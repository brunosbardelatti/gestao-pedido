import {
  CustomerForm,
  type CustomerFormInitialValues,
} from './customer-form';

interface UpdateCustomerFormProps {
  customerId: string;
  initialValues: CustomerFormInitialValues;
}

export function UpdateCustomerForm(
  props: UpdateCustomerFormProps,
): React.JSX.Element {
  return <CustomerForm intent="update" {...props} />;
}
