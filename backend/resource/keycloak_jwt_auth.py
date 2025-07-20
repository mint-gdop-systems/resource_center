import requests
from jose import jwt
from jose.exceptions import JWTError
from django.conf import settings
from rest_framework import authentication, exceptions
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

class KeycloakJWTAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class for validating Keycloak JWTs.
    """
    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).split()
        logger.debug(f"Auth header: {auth_header}")
        
        if not auth_header or auth_header[0].lower() != b'bearer':
            logger.debug("No bearer token found")
            return None
        if len(auth_header) == 1:
            raise exceptions.AuthenticationFailed('Invalid token header. No credentials provided.')
        elif len(auth_header) > 2:
            raise exceptions.AuthenticationFailed('Invalid token header. Token string should not contain spaces.')
        try:
            token = auth_header[1].decode()
            logger.debug(f"Token received: {token[:50]}...")
        except UnicodeError:
            raise exceptions.AuthenticationFailed('Invalid token header. Token string should not contain invalid characters.')

        # Validate the JWT
        try:
            jwks_url = f"{settings.KEYCLOAK_URL}/realms/{settings.REALM}/protocol/openid-connect/certs"
            logger.debug(f"Fetching JWKS from: {jwks_url}")
            jwks = requests.get(jwks_url).json()
            unverified_header = jwt.get_unverified_header(token)
            logger.debug(f"Token header: {unverified_header}")
            
            rsa_key = {}
            for key in jwks["keys"]:
                if key["kid"] == unverified_header["kid"]:
                    rsa_key = {
                        "kty": key["kty"],
                        "kid": key["kid"],
                        "use": key["use"],
                        "n": key["n"],
                        "e": key["e"]
                    }
                    break
            if not rsa_key:
                logger.error(f"Public key not found for kid: {unverified_header.get('kid')}")
                raise exceptions.AuthenticationFailed('Public key not found in JWKS.')
                
            logger.debug("Decoding JWT...")
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=[unverified_header["alg"]],
                audience=settings.OIDC_RP_CLIENT_ID,
                issuer=f"{settings.KEYCLOAK_URL}/realms/{settings.REALM}"
            )
            logger.debug(f"JWT payload: {payload}")
        except JWTError as e:
            logger.error(f"JWT validation error: {str(e)}")
            raise exceptions.AuthenticationFailed(f'JWT validation error: {str(e)}')
        except Exception as e:
            logger.error(f"JWT validation failed: {str(e)}")
            raise exceptions.AuthenticationFailed(f'JWT validation failed: {str(e)}')

        # Get or create user
        username = payload.get('preferred_username') or payload.get('sub')
        email = payload.get('email')
        if not username:
            raise exceptions.AuthenticationFailed('JWT does not contain a username.')
            
        logger.debug(f"Creating/getting user: {username}, email: {email}")
        user, _ = User.objects.get_or_create(username=username, defaults={
            'email': email or '',
            'first_name': payload.get('given_name', ''),
            'last_name': payload.get('family_name', ''),
        })
        logger.debug(f"User authenticated: {user.username}")
        return (user, None) 