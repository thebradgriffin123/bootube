-- Create a custom profiles table to handle premium status and settings
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  stripe_customer_id text,
  subscription_status text default 'free', -- 'free', 'active', 'trailing', 'canceled'
  
  -- Premium Features Configuration
  custom_filter_words text[] default '{}', -- Array of custom words to mute
  blur_screen_enabled boolean default false, -- Premium feature: Blur screen on alert
  buffer_timer_seconds integer default 0 -- Premium feature: Buffer timer duration
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies so users can read/write their own profiles
create policy "Users can view own profile" on public.profiles 
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles 
  for update using (auth.uid() = id);

-- Trigger function to automatically create a profile for new auth users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, subscription_status)
  values (new.id, 'free');
  return new;
end;
$$ language plpgsql security definer;

-- Create the trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
