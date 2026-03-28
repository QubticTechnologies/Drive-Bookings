--
-- PostgreSQL database dump
--

\restrict AJI8qJcYwqCNSvdMle2vDljqlSHfbVlfV8IspiXKlhXxKKNSfArZZwIEMjL4DfR

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: bill_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.bill_status AS ENUM (
    'unpaid',
    'paid'
);


ALTER TYPE public.bill_status OWNER TO postgres;

--
-- Name: driver_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.driver_status AS ENUM (
    'available',
    'busy',
    'offline'
);


ALTER TYPE public.driver_status OWNER TO postgres;

--
-- Name: ride_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ride_status AS ENUM (
    'pending',
    'accepted',
    'in_progress',
    'completed',
    'cancelled',
    'scheduled'
);


ALTER TYPE public.ride_status OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bills (
    id integer NOT NULL,
    ride_id integer NOT NULL,
    driver_id integer,
    client_name text NOT NULL,
    pickup_location text NOT NULL,
    dropoff_location text NOT NULL,
    distance_km real NOT NULL,
    base_fare real NOT NULL,
    distance_fare real NOT NULL,
    total_fare real NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status public.bill_status DEFAULT 'unpaid'::public.bill_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bills OWNER TO postgres;

--
-- Name: bills_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bills_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bills_id_seq OWNER TO postgres;

--
-- Name: bills_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bills_id_seq OWNED BY public.bills.id;


--
-- Name: drivers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drivers (
    id integer NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    email text NOT NULL,
    license_number text NOT NULL,
    vehicle_make text NOT NULL,
    vehicle_model text NOT NULL,
    vehicle_year integer NOT NULL,
    vehicle_plate text NOT NULL,
    vehicle_color text NOT NULL,
    status public.driver_status DEFAULT 'available'::public.driver_status NOT NULL,
    rating real DEFAULT 5 NOT NULL,
    total_rides integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    last_lat real,
    last_lng real,
    last_location_updated_at timestamp without time zone
);


ALTER TABLE public.drivers OWNER TO postgres;

--
-- Name: drivers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.drivers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drivers_id_seq OWNER TO postgres;

--
-- Name: drivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.drivers_id_seq OWNED BY public.drivers.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ride_id integer,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'BSD'::character varying,
    status character varying(20),
    payment_method character varying(20),
    stripe_payment_intent_id character varying(255),
    stripe_transfer_id character varying(255),
    fee_amount numeric(10,2),
    net_amount numeric(10,2),
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    CONSTRAINT payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: rides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rides (
    id integer NOT NULL,
    client_name text NOT NULL,
    client_phone text NOT NULL,
    pickup_location text NOT NULL,
    pickup_lat real NOT NULL,
    pickup_lng real NOT NULL,
    dropoff_location text NOT NULL,
    dropoff_lat real NOT NULL,
    dropoff_lng real NOT NULL,
    distance_km real DEFAULT 0 NOT NULL,
    driver_id integer,
    status public.ride_status DEFAULT 'pending'::public.ride_status NOT NULL,
    estimated_fare real DEFAULT 0 NOT NULL,
    final_fare real,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    accepted_at timestamp without time zone,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    scheduled_at timestamp without time zone,
    admin_note text,
    is_suspicious boolean DEFAULT false,
    is_flagged_refund boolean DEFAULT false,
    fare_adjusted boolean DEFAULT false,
    cancellation_reason text
);


ALTER TABLE public.rides OWNER TO postgres;

--
-- Name: rides_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rides_id_seq OWNER TO postgres;

--
-- Name: rides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rides_id_seq OWNED BY public.rides.id;


--
-- Name: safety_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.safety_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ride_id integer,
    event_type character varying(50),
    severity character varying(20),
    description text,
    location_latitude numeric(10,8),
    location_longitude numeric(11,8),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    resolution_notes text,
    reported_by uuid,
    assigned_to uuid,
    CONSTRAINT safety_events_event_type_check CHECK (((event_type)::text = ANY ((ARRAY['sos'::character varying, 'route_deviation'::character varying, 'speed_violation'::character varying, 'unauthorized_stop'::character varying, 'user_report'::character varying])::text[]))),
    CONSTRAINT safety_events_severity_check CHECK (((severity)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))
);


ALTER TABLE public.safety_events OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number character varying(20) NOT NULL,
    email character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    user_type character varying(20),
    is_verified boolean DEFAULT false,
    verification_code character varying(6),
    rating numeric(3,2) DEFAULT 5.0,
    total_rides integer DEFAULT 0,
    profile_picture_url text,
    preferred_language character varying(10) DEFAULT 'en'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_login timestamp without time zone,
    CONSTRAINT users_user_type_check CHECK (((user_type)::text = ANY ((ARRAY['rider'::character varying, 'driver'::character varying, 'both'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    make character varying(50),
    model character varying(50),
    year integer,
    color character varying(30),
    license_plate character varying(20) NOT NULL,
    vehicle_type character varying(20),
    seat_capacity integer DEFAULT 4,
    luggage_capacity integer DEFAULT 2,
    is_airport_approved boolean DEFAULT false,
    is_cruise_port_approved boolean DEFAULT false,
    vehicle_photo_url text,
    registration_document_url text,
    insurance_document_url text,
    inspection_certificate_url text,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT vehicles_vehicle_type_check CHECK (((vehicle_type)::text = ANY ((ARRAY['standard'::character varying, 'premium'::character varying, 'van'::character varying, 'luxury'::character varying])::text[])))
);


ALTER TABLE public.vehicles OWNER TO postgres;

--
-- Name: bills id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bills ALTER COLUMN id SET DEFAULT nextval('public.bills_id_seq'::regclass);


--
-- Name: drivers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers ALTER COLUMN id SET DEFAULT nextval('public.drivers_id_seq'::regclass);


--
-- Name: rides id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rides ALTER COLUMN id SET DEFAULT nextval('public.rides_id_seq'::regclass);


--
-- Data for Name: bills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bills (id, ride_id, driver_id, client_name, pickup_location, dropoff_location, distance_km, base_fare, distance_fare, total_fare, currency, status, created_at) FROM stdin;
\.


--
-- Data for Name: drivers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.drivers (id, name, phone, email, license_number, vehicle_make, vehicle_model, vehicle_year, vehicle_plate, vehicle_color, status, rating, total_rides, created_at, last_lat, last_lng, last_location_updated_at) FROM stdin;
1	James Wilson	07700900123	james@example.com	WILSO1234567JW	BMW	3 Series	2022	LN22 BMW	Black	available	5	0	2026-03-21 18:15:12.927355	\N	\N	\N
2	job. gumbs	+1 (242) 4684005	mycriticalthinking123@gmail.com	BS242DRV01	Bmw	320i	2022	NP 4821	Pearl White	busy	5	0	2026-03-23 00:57:08.390773	25.048265	-77.31553	2026-03-23 00:57:33.536
3	job. gumbs	+1 (242)4684005	mycriticalthinking123@gamil.com	BS10152WL	BMW	320i	2020	NS3456	blue	busy	5	0	2026-03-23 01:05:56.754655	25.040232	-77.40715	2026-03-23 01:06:11.886
4	job gumbs	242-468-4005	jobgumbs@gmail.com	QWT5672	Chevrolet	Equinox	2016	JG1555	Red	available	5	0	2026-03-24 12:38:14.546884	25.086355	-77.3983	2026-03-24 12:39:37.632
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, ride_id, amount, currency, status, payment_method, stripe_payment_intent_id, stripe_transfer_id, fee_amount, net_amount, metadata, created_at, completed_at) FROM stdin;
\.


--
-- Data for Name: rides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rides (id, client_name, client_phone, pickup_location, pickup_lat, pickup_lng, dropoff_location, dropoff_lat, dropoff_lng, distance_km, driver_id, status, estimated_fare, final_fare, notes, created_at, accepted_at, started_at, completed_at, scheduled_at, admin_note, is_suspicious, is_flagged_refund, fare_adjusted, cancellation_reason) FROM stdin;
2	sherline gumbs	242468 0472	chipinham 	24.981	-77.3484	benard road	24.972	-77.4494	10.229475	2	in_progress	18.34	\N	reaching by  ocean blue on Bernard road	2026-03-23 00:54:33.186063	2026-03-23 00:57:25.089	2026-03-23 00:57:28.097	\N	\N	\N	f	f	f	\N
1	Sarah Brown	07900123456	Paddington Station, London	51.5154	-0.1755	Canary Wharf, London	51.5055	-0.0235	10.576541	3	in_progress	18.86	\N	Please help with luggage	2026-03-21 18:15:18.007789	2026-03-23 01:06:06.415	2026-03-23 01:06:09.007	\N	\N	\N	f	f	f	\N
3	sherline chase	242-468 0724	Nassau Cruise Port	25.0811	-77.3513	Cable Beach	25.07	-77.39	4.0884194	\N	pending	9.13	\N	\N	2026-03-23 18:15:58.372336	\N	\N	\N	\N	\N	f	f	f	\N
4	Peter Pan	242 4684006	Nassau Cruise Port	25.0811	-77.3513	Atlantis Paradise Island	25.0872	-77.3149	3.7279854	\N	pending	8.59	\N	\N	2026-03-23 18:56:54.905749	\N	\N	\N	\N	\N	f	f	f	\N
5	jacob joel	+242-345-6709	Sandals Royal Bahamian	25.07	-77.387	Nassau Cruise Port (Prince George Wharf)	25.0811	-77.3513	3.8014672	\N	pending	8.7	\N	I'll be at the entrance 🚪	2026-03-24 11:59:33.282748	\N	\N	\N	\N	\N	f	f	f	\N
6	paul 	242-678-5555	Lynden Pindling Int'l Airport	25.0389	-77.4659	Atlantis Paradise Island	25.0872	-77.3149	16.129877	\N	pending	27.19	\N	Meet me inside 🏠	2026-03-24 13:02:30.596322	\N	\N	\N	\N	Test note from admin	f	f	f	\N
7	John Victor	7572237	Providence Avenue, Nassau	25.071817	-77.35843	Straw Market (Bay Street)	25.0787	-77.344	1.642	\N	pending	5.46	\N	for 2 , green shirt and blue pants	2026-03-25 14:43:40.785749	\N	\N	\N	\N	\N	f	f	f	\N
8	Jhon prescott	242-522-4512	Rosalind Street	25.071941	-77.35807	Atlantis Paradise Island	25.0872	-77.3149	4.6671915	\N	pending	10	\N	 2 of us	2026-03-25 15:31:50.672812	\N	\N	\N	\N	\N	f	f	f	\N
\.


--
-- Data for Name: safety_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.safety_events (id, ride_id, event_type, severity, description, location_latitude, location_longitude, "timestamp", resolved_at, resolution_notes, reported_by, assigned_to) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, phone_number, email, first_name, last_name, user_type, is_verified, verification_code, rating, total_rides, profile_picture_url, preferred_language, is_active, created_at, updated_at, last_login) FROM stdin;
ccb2ec5f-244f-4724-8083-34ecb8fbc744	+1 (242) 555-1234	\N	\N	\N	rider	t	\N	5.00	0	\N	en	t	2026-03-23 17:46:25.19413	2026-03-23 17:46:31.056	2026-03-23 17:46:31.056
ecdd6ed9-0847-4a6c-8fd6-5f60a172c6f7	+1 (242) 4684005	\N	\N	\N	rider	t	\N	5.00	0	\N	en	t	2026-03-23 18:03:14.678681	2026-03-23 18:03:15.243	2026-03-23 18:03:15.243
d69eb30f-a06f-4573-94b4-80edaee70b1c	+1 (242) 456-0987	\N	\N	\N	rider	t	\N	5.00	0	\N	en	t	2026-03-24 00:03:58.076256	2026-03-24 00:03:58.479	2026-03-24 00:03:58.479
fbf1b011-58d9-4445-a8e1-291aa2b3b997	+1 (242) 468-4005	\N	\N	\N	rider	t	\N	5.00	0	\N	en	t	2026-03-24 00:23:45.666673	2026-03-24 13:13:28.51	2026-03-24 13:13:28.51
d56c68c6-4ed7-4e75-bd3d-3d4a817bba6f	+1 (242) 468-40045	\N	\N	\N	rider	t	\N	5.00	0	\N	en	t	2026-03-24 13:35:51.685185	2026-03-24 13:35:52.228	2026-03-24 13:35:52.228
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vehicles (id, make, model, year, color, license_plate, vehicle_type, seat_capacity, luggage_capacity, is_airport_approved, is_cruise_port_approved, vehicle_photo_url, registration_document_url, insurance_document_url, inspection_certificate_url, is_verified, created_at) FROM stdin;
\.


--
-- Name: bills_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bills_id_seq', 1, false);


--
-- Name: drivers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.drivers_id_seq', 5, true);


--
-- Name: rides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rides_id_seq', 8, true);


--
-- Name: bills bills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_email_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_email_unique UNIQUE (email);


--
-- Name: drivers drivers_license_number_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_license_number_unique UNIQUE (license_number);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: drivers drivers_vehicle_plate_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_vehicle_plate_unique UNIQUE (vehicle_plate);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: rides rides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_pkey PRIMARY KEY (id);


--
-- Name: safety_events safety_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_events
    ADD CONSTRAINT safety_events_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_license_plate_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_license_plate_key UNIQUE (license_plate);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: idx_payments_ride_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_ride_id ON public.payments USING btree (ride_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_rides_driver_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rides_driver_id ON public.rides USING btree (driver_id);


--
-- Name: idx_rides_requested_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rides_requested_at ON public.rides USING btree (created_at);


--
-- Name: idx_rides_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_rides_status ON public.rides USING btree (status);


--
-- Name: idx_safety_ride_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safety_ride_id ON public.safety_events USING btree (ride_id);


--
-- Name: idx_safety_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_safety_type ON public.safety_events USING btree (event_type, severity);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone_number);


--
-- Name: idx_users_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_type ON public.users USING btree (user_type, is_active);


--
-- Name: idx_vehicles_plate; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vehicles_plate ON public.vehicles USING btree (license_plate);


--
-- Name: bills bills_driver_id_drivers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_driver_id_drivers_id_fk FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: bills bills_ride_id_rides_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bills
    ADD CONSTRAINT bills_ride_id_rides_id_fk FOREIGN KEY (ride_id) REFERENCES public.rides(id);


--
-- Name: payments payments_ride_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id);


--
-- Name: rides rides_driver_id_drivers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rides
    ADD CONSTRAINT rides_driver_id_drivers_id_fk FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: safety_events safety_events_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_events
    ADD CONSTRAINT safety_events_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: safety_events safety_events_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_events
    ADD CONSTRAINT safety_events_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id);


--
-- Name: safety_events safety_events_ride_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.safety_events
    ADD CONSTRAINT safety_events_ride_id_fkey FOREIGN KEY (ride_id) REFERENCES public.rides(id);


--
-- PostgreSQL database dump complete
--

\unrestrict AJI8qJcYwqCNSvdMle2vDljqlSHfbVlfV8IspiXKlhXxKKNSfArZZwIEMjL4DfR

